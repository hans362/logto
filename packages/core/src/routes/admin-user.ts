import { emailRegEx, passwordRegEx, phoneRegEx, usernameRegEx } from '@logto/core-kit';
import { arbitraryObjectGuard, userInfoSelectFields } from '@logto/schemas';
import { has } from '@silverhand/essentials';
import pick from 'lodash.pick';
import { boolean, literal, object, string } from 'zod';

import { isTrue } from '#src/env-set/parameters.js';
import RequestError from '#src/errors/RequestError/index.js';
import { encryptUserPassword, generateUserId, insertUser } from '#src/lib/user.js';
import koaGuard from '#src/middleware/koa-guard.js';
import koaPagination from '#src/middleware/koa-pagination.js';
import { revokeInstanceByUserId } from '#src/queries/oidc-model-instance.js';
import { findRolesByRoleNames } from '#src/queries/roles.js';
import {
  deleteUserById,
  deleteUserIdentity,
  findUsers,
  countUsers,
  findUserById,
  hasUser,
  updateUserById,
  hasUserWithEmail,
} from '#src/queries/user.js';
import { deleteUsersRolesByUserIdAndRoleId, insertUsersRoles } from '#src/queries/users-roles.js';
import assertThat from '#src/utils/assert-that.js';

import { checkSignUpIdentifierCollision } from './session/utils.js';
import type { AuthedRouter } from './types.js';

export default function adminUserRoutes<T extends AuthedRouter>(router: T) {
  router.get(
    '/users',
    koaPagination(),
    koaGuard({
      query: object({
        search: string().optional(),
        // Use `.transform()` once the type issue fixed
        hideAdminUser: string().optional(),
        isCaseSensitive: string().optional(),
      }),
    }),
    async (ctx, next) => {
      const { limit, offset } = ctx.pagination;
      const {
        query: { search, hideAdminUser: _hideAdminUser, isCaseSensitive: _isCaseSensitive },
      } = ctx.guard;

      const hideAdminUser = isTrue(_hideAdminUser);
      const isCaseSensitive = isTrue(_isCaseSensitive);
      const [{ count }, users] = await Promise.all([
        countUsers(search, hideAdminUser, isCaseSensitive),
        findUsers(limit, offset, search, hideAdminUser, isCaseSensitive),
      ]);

      ctx.pagination.totalCount = count;
      ctx.body = users.map((user) => pick(user, ...userInfoSelectFields));

      return next();
    }
  );

  router.get(
    '/users/:userId',
    koaGuard({
      params: object({ userId: string() }),
    }),
    async (ctx, next) => {
      const {
        params: { userId },
      } = ctx.guard;

      const user = await findUserById(userId);

      ctx.body = pick(user, ...userInfoSelectFields);

      return next();
    }
  );

  router.get(
    '/users/:userId/custom-data',
    koaGuard({
      params: object({ userId: string() }),
      response: arbitraryObjectGuard,
    }),
    async (ctx, next) => {
      const {
        params: { userId },
      } = ctx.guard;

      const { customData } = await findUserById(userId);
      ctx.body = customData;

      return next();
    }
  );

  router.patch(
    '/users/:userId/custom-data',
    koaGuard({
      params: object({ userId: string() }),
      body: object({ customData: arbitraryObjectGuard }),
      response: arbitraryObjectGuard,
    }),
    async (ctx, next) => {
      const {
        params: { userId },
        body: { customData },
      } = ctx.guard;

      await findUserById(userId);

      const user = await updateUserById(userId, {
        customData,
      });

      ctx.body = user.customData;

      return next();
    }
  );

  router.post(
    '/users',
    koaGuard({
      body: object({
        primaryEmail: string().regex(emailRegEx).optional(),
        username: string().regex(usernameRegEx).optional(),
        password: string().regex(passwordRegEx),
        name: string().optional(),
      }),
    }),
    async (ctx, next) => {
      const { primaryEmail, username, password, name } = ctx.guard.body;

      assertThat(
        !username || !(await hasUser(username)),
        new RequestError({
          code: 'user.username_exists_register',
          status: 422,
        })
      );
      assertThat(
        !primaryEmail || !(await hasUserWithEmail(primaryEmail)),
        new RequestError({
          code: 'user.email_exists_register',
          status: 422,
        })
      );

      const id = await generateUserId();

      const { passwordEncrypted, passwordEncryptionMethod } = await encryptUserPassword(password);

      const user = await insertUser({
        id,
        primaryEmail,
        username,
        passwordEncrypted,
        passwordEncryptionMethod,
        name,
      });

      ctx.body = pick(user, ...userInfoSelectFields);

      return next();
    }
  );

  router.patch(
    '/users/:userId',
    koaGuard({
      params: object({ userId: string() }),
      body: object({
        username: string().regex(usernameRegEx).or(literal('')).nullable().optional(),
        primaryEmail: string().regex(emailRegEx).or(literal('')).nullable().optional(),
        primaryPhone: string().regex(phoneRegEx).or(literal('')).nullable().optional(),
        name: string().or(literal('')).nullable().optional(),
        avatar: string().url().or(literal('')).nullable().optional(),
        customData: arbitraryObjectGuard.optional(),
        roleNames: string().array().optional(),
      }),
    }),
    async (ctx, next) => {
      const {
        params: { userId },
        body,
      } = ctx.guard;

      const user = await findUserById(userId);
      await checkSignUpIdentifierCollision(body, userId);

      const { roleNames, ...userUpdates } = body;

      // Temp solution to validate the existence of input roleNames
      if (roleNames) {
        const roles = await findRolesByRoleNames(roleNames);

        // Insert new roles
        const newRoles = roleNames.filter((roleName) => !user.roleNames.includes(roleName));

        if (newRoles.length > 0) {
          await insertUsersRoles(
            newRoles.map((roleName) => {
              const role = roles.find(({ name }) => name === roleName);

              if (!role) {
                throw new RequestError({
                  status: 400,
                  code: 'user.invalid_role_names',
                  data: {
                    roleNames: roleName,
                  },
                });
              }

              return {
                userId: user.id,
                roleId: role.id,
              };
            })
          );
        }

        // Remove old roles
        const oldRoles = user.roleNames.filter((roleName) => !roleNames.includes(roleName));

        if (oldRoles.length > 0) {
          await Promise.all(
            oldRoles.map(async (roleName) => {
              const role = roles.find(({ name }) => name === roleName);

              if (role) {
                await deleteUsersRolesByUserIdAndRoleId(user.id, role.id);
              }
            })
          );
        }
      }

      const updatedUser = await updateUserById(userId, userUpdates, 'replace');

      ctx.body = pick(updatedUser, ...userInfoSelectFields);

      return next();
    }
  );

  router.patch(
    '/users/:userId/password',
    koaGuard({
      params: object({ userId: string() }),
      body: object({ password: string().regex(passwordRegEx) }),
    }),
    async (ctx, next) => {
      const {
        params: { userId },
        body: { password },
      } = ctx.guard;

      await findUserById(userId);

      const { passwordEncrypted, passwordEncryptionMethod } = await encryptUserPassword(password);

      const user = await updateUserById(userId, {
        passwordEncrypted,
        passwordEncryptionMethod,
      });

      ctx.body = pick(user, ...userInfoSelectFields);

      return next();
    }
  );

  router.patch(
    '/users/:userId/is-suspended',
    koaGuard({
      params: object({ userId: string() }),
      body: object({ isSuspended: boolean() }),
    }),
    async (ctx, next) => {
      const {
        params: { userId },
        body: { isSuspended },
      } = ctx.guard;

      await findUserById(userId);

      const user = await updateUserById(userId, {
        isSuspended,
      });

      if (isSuspended) {
        await revokeInstanceByUserId('refreshToken', user.id);
      }

      ctx.body = pick(user, ...userInfoSelectFields);

      return next();
    }
  );

  router.delete(
    '/users/:userId',
    koaGuard({
      params: object({ userId: string() }),
    }),
    async (ctx, next) => {
      const {
        params: { userId },
      } = ctx.guard;

      if (userId === ctx.auth.id) {
        throw new RequestError('user.cannot_delete_self');
      }

      await findUserById(userId);

      await deleteUserById(userId);

      ctx.status = 204;

      return next();
    }
  );

  router.delete(
    '/users/:userId/identities/:target',
    koaGuard({ params: object({ userId: string(), target: string() }) }),
    async (ctx, next) => {
      const {
        params: { userId, target },
      } = ctx.guard;

      const { identities } = await findUserById(userId);

      if (!has(identities, target)) {
        throw new RequestError({ code: 'user.identity_not_exists', status: 404 });
      }

      const updatedUser = await deleteUserIdentity(userId, target);
      ctx.body = pick(updatedUser, ...userInfoSelectFields);

      return next();
    }
  );
}
