import type { ConnectorMetadata } from '@logto/connector-kit';
import type { Application, LogType, UserInfo } from '@logto/schemas';
import { userInfoSelectFields, HookEventType, LogResult } from '@logto/schemas';
import type { Optional } from '@silverhand/essentials';
import { pick } from '@silverhand/essentials';
import got from 'got/dist/source';
import type { MiddlewareType } from 'koa';

import { getLogtoConnectorById } from '@/connectors';
import { findApplicationById } from '@/queries/application';
import { findHooksByType } from '@/queries/hook';
import { findUserById } from '@/queries/user';

import type { WithLogContext } from './koa-log';

const applicationInfoSelectFields = Object.freeze(['id', 'type', 'name', 'description'] as const);

type ApplicationInfo = Pick<Application, typeof applicationInfoSelectFields[number]>;

const connectorInfoSelectFields = Object.freeze([
  'id',
  'target',
  'platform',
  'name',
  'description',
] as const);

type ConnectorInfo = Pick<ConnectorMetadata, typeof connectorInfoSelectFields[number]>;

type EventPayload = {
  hookId: string;
  event: HookEventType;
  logType: LogType; // What kind of log that triggers this event?
  createdAt: number; // Epoch timestamp in milliseconds
  user?: UserInfo; // Pick from select fields, leave it optional in case we implement M2M hooks
  app?: ApplicationInfo; // E.g. App ID, name, etc.
  connector?: ConnectorInfo; // Non-empty if a connector is involved
  socialUserInfo?: unknown; // User info returned from social connector
  sessionId?: string;
  userAgent?: string;
};

const findEntity: <Entity>(
  id: unknown,
  findEntity: (id: string) => Promise<Entity>
) => Promise<Optional<Entity>> = async (id, findEntity) => {
  if (typeof id !== 'string') {
    return;
  }

  try {
    return await findEntity(id);
  } catch {}
};

export default function koaHooks<
  StateT,
  ContextT extends WithLogContext,
  ResponseBodyT
>(): MiddlewareType<StateT, ContextT, ResponseBodyT> {
  return async (ctx, next) => {
    const run = async () => {
      const { type, basePayload, payload } = ctx.logger;

      // Check if current log is successful
      if (!type || basePayload?.result !== LogResult.Success) {
        return;
      }

      // We only have `Post` hooks now, so hard code slice start position to 4
      const hookType = Object.values(HookEventType).find(
        (value) => !type.startsWith(value.slice(4))
      );

      // Check if the log type is valid for triggering hooks
      if (!hookType) {
        return;
      }

      const hooks = await findHooksByType(hookType);

      if (hooks.length === 0) {
        return;
      }

      // Compose data
      const [user, application, connector] = await Promise.all([
        findEntity(payload.userId, findUserById),
        findEntity(basePayload.applicationId, findApplicationById),
        findEntity(payload.connectorId, getLogtoConnectorById),
      ]);

      // Trigger hooks
      await Promise.all(
        hooks.map(async ({ id, event, config: { url, headers, retries } }) => {
          const eventPayload: EventPayload = {
            hookId: id,
            event,
            logType: type,
            createdAt: Date.now(),
            user: user && pick(user, ...userInfoSelectFields),
            app: application && pick(application, ...applicationInfoSelectFields),
            connector: connector && pick(connector.metadata, ...connectorInfoSelectFields),
            // The name `userInfo` in session APIs and logs is too confusing. Needs refactor.
            socialUserInfo: payload.userInfo,
            sessionId: basePayload.sessionId,
            userAgent: basePayload.userAgent,
          };

          try {
            await got.post(url, { headers, retry: retries, json: eventPayload });
          } catch {}
        })
      );
    };

    void run();

    return next();
  };
}
