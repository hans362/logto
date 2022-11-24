import type { CreateUser, User } from '../db-entries/index.js';

export const userInfoSelectFields = Object.freeze([
  'id',
  'username',
  'primaryEmail',
  'primaryPhone',
  'name',
  'avatar',
  'customData',
  'identities',
  'lastSignInAt',
  'createdAt',
  'applicationId',
  'isSuspended',
] as const);

export type UserInfo<Keys extends keyof CreateUser = typeof userInfoSelectFields[number]> = Pick<
  CreateUser,
  Keys
>;

export enum UserRole {
  Admin = 'admin',
}

// FIXME @sijie remove this after RBAC is completed.
export type UserWithRoleNames = User & { roleNames: string[] };
