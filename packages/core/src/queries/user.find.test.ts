import { Roles, UserRole, Users, UsersRoles } from '@logto/schemas';
import { convertToIdentifiers } from '@logto/shared';
import { createMockPool, createMockQueryResult, sql } from 'slonik';

import { mockUser } from '#src/__mocks__/index.js';
import envSet from '#src/env-set/index.js';
import type { QueryType } from '#src/utils/test-utils.js';
import { expectSqlAssert } from '#src/utils/test-utils.js';

import { findUsers } from './user.js';

const mockQuery: jest.MockedFunction<QueryType> = jest.fn();

jest.spyOn(envSet, 'pool', 'get').mockReturnValue(
  createMockPool({
    query: async (sql, values) => {
      return mockQuery(sql, values);
    },
  })
);

describe('user query', () => {
  const { table, fields } = convertToIdentifiers(Users);
  const { fields: rolesFields, table: rolesTable } = convertToIdentifiers(Roles);
  const { fields: usersRolesFields, table: usersRolesTable } = convertToIdentifiers(UsersRoles);
  const dbvalue = {
    ...mockUser,
    roleNames: JSON.stringify(mockUser.roleNames),
    identities: JSON.stringify(mockUser.identities),
    customData: JSON.stringify(mockUser.customData),
  };

  it('findUsers', async () => {
    const search = 'foo';
    const limit = 100;
    const offset = 1;
    const expectSql = sql`
      select ${sql.join(
        Object.values(fields).map((field) => sql`${table}.${field}`),
        sql`,`
      )}
      from ${table}
      where ${table}.${fields.primaryEmail} ilike $1 or ${table}.${
      fields.primaryPhone
    } ilike $2 or ${table}.${fields.username} ilike $3 or ${table}.${fields.name} ilike $4
      limit $5
      offset $6
    `;

    mockQuery.mockImplementationOnce(async (sql, values) => {
      expectSqlAssert(sql, expectSql.sql);
      expect(values).toEqual([
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        limit,
        offset,
      ]);

      return createMockQueryResult([dbvalue]);
    });

    await expect(findUsers(limit, offset, search)).resolves.toEqual([dbvalue]);
  });

  it('findUsers with hideAdminUser', async () => {
    const search = 'foo';
    const limit = 100;
    const offset = 1;
    const expectSql = sql`
      select ${sql.join(
        Object.values(fields).map((field) => sql`${table}.${field}`),
        sql`,`
      )}
      from ${table}
      left join ${usersRolesTable} ON ${table}.${fields.id} = ${usersRolesTable}.${
      usersRolesFields.userId
    }
      left join ${rolesTable} ON ${rolesTable}.${rolesFields.id} = ${usersRolesTable}.${
      usersRolesFields.roleId
    }
      where ${rolesTable}.${rolesFields.name} !== ${UserRole.Admin}
      and (${table}.${fields.primaryEmail} ilike $2 or ${table}.${
      fields.primaryPhone
    } ilike $3 or ${table}.${fields.username} ilike $4 or ${table}.${fields.name} ilike $5)
      limit $6
      offset $7
    `;

    mockQuery.mockImplementationOnce(async (sql, values) => {
      expectSqlAssert(sql, expectSql.sql);
      expect(values).toEqual([
        UserRole.Admin,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        limit,
        offset,
      ]);

      return createMockQueryResult([dbvalue]);
    });

    await expect(findUsers(limit, offset, search, true)).resolves.toEqual([dbvalue]);
  });

  it('findUsers with isCaseSensitive', async () => {
    const search = 'foo';
    const limit = 100;
    const offset = 1;
    const expectSql = sql`
      select ${sql.join(
        Object.values(fields).map((field) => sql`${table}.${field}`),
        sql`,`
      )}
      from ${table}
      where ${table}.${fields.primaryEmail} like $1 or ${table}.${
      fields.primaryPhone
    } like $2 or ${table}.${fields.username} like $3 or ${table}.${fields.name} like $4
      limit $5
      offset $6
    `;

    mockQuery.mockImplementationOnce(async (sql, values) => {
      expectSqlAssert(sql, expectSql.sql);
      expect(values).toEqual([
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        limit,
        offset,
      ]);

      return createMockQueryResult([dbvalue]);
    });

    await expect(findUsers(limit, offset, search, undefined, true)).resolves.toEqual([dbvalue]);
  });
});
