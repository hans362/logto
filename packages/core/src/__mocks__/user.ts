import type { UserWithRoleNames } from '@logto/schemas';
import { userInfoSelectFields, UsersPasswordEncryptionMethod } from '@logto/schemas';
import pick from 'lodash.pick';

export const mockUser: UserWithRoleNames = {
  id: 'foo',
  username: 'foo',
  primaryEmail: 'foo@logto.io',
  primaryPhone: '111111',
  roleNames: ['admin'],
  passwordEncrypted: 'password',
  passwordEncryptionMethod: UsersPasswordEncryptionMethod.Argon2i,
  name: null,
  avatar: null,
  identities: {
    connector1: { userId: 'connector1', details: {} },
  },
  customData: {},
  applicationId: 'bar',
  lastSignInAt: 1_650_969_465_789,
  createdAt: 1_650_969_000_000,
  isSuspended: false,
};

export const mockUserResponse = pick(mockUser, ...userInfoSelectFields);

export const mockPasswordEncrypted = 'a1b2c3';
export const mockUserWithPassword: UserWithRoleNames = {
  id: 'id',
  username: 'username',
  primaryEmail: 'foo@logto.io',
  primaryPhone: '111111',
  roleNames: ['admin'],
  passwordEncrypted: mockPasswordEncrypted,
  passwordEncryptionMethod: UsersPasswordEncryptionMethod.Argon2i,
  name: null,
  avatar: null,
  identities: {
    connector1: { userId: 'connector1', details: {} },
  },
  customData: {},
  applicationId: 'bar',
  lastSignInAt: 1_650_969_465_789,
  createdAt: 1_650_969_000_000,
  isSuspended: false,
};

export const mockUserList: UserWithRoleNames[] = [
  {
    id: '1',
    username: 'foo1',
    primaryEmail: 'foo1@logto.io',
    primaryPhone: '111111',
    roleNames: ['admin'],
    passwordEncrypted: null,
    passwordEncryptionMethod: null,
    name: null,
    avatar: null,
    identities: {},
    customData: {},
    applicationId: 'bar',
    lastSignInAt: 1_650_969_465_000,
    createdAt: 1_650_969_000_000,
    isSuspended: false,
  },
  {
    id: '2',
    username: 'foo2',
    primaryEmail: 'foo2@logto.io',
    primaryPhone: '111111',
    roleNames: ['admin'],
    passwordEncrypted: null,
    passwordEncryptionMethod: null,
    name: null,
    avatar: null,
    identities: {},
    customData: {},
    applicationId: 'bar',
    lastSignInAt: 1_650_969_465_000,
    createdAt: 1_650_969_000_000,
    isSuspended: false,
  },
  {
    id: '3',
    username: 'foo3',
    primaryEmail: 'foo3@logto.io',
    primaryPhone: '111111',
    roleNames: ['admin'],
    passwordEncrypted: null,
    passwordEncryptionMethod: null,
    name: null,
    avatar: null,
    identities: {},
    customData: {},
    applicationId: 'bar',
    lastSignInAt: 1_650_969_465_000,
    createdAt: 1_650_969_000_000,
    isSuspended: false,
  },
  {
    id: '4',
    username: 'bar1',
    primaryEmail: 'bar1@logto.io',
    primaryPhone: '111111',
    roleNames: ['admin'],
    passwordEncrypted: null,
    passwordEncryptionMethod: null,
    name: null,
    avatar: null,
    identities: {},
    customData: {},
    applicationId: 'bar',
    lastSignInAt: 1_650_969_465_000,
    createdAt: 1_650_969_000_000,
    isSuspended: false,
  },
  {
    id: '5',
    username: 'bar2',
    primaryEmail: 'bar2@logto.io',
    primaryPhone: '111111',
    roleNames: ['admin'],
    passwordEncrypted: null,
    passwordEncryptionMethod: null,
    name: null,
    avatar: null,
    identities: {},
    customData: {},
    applicationId: 'bar',
    lastSignInAt: 1_650_969_465_000,
    createdAt: 1_650_969_000_000,
    isSuspended: false,
  },
];

export const mockUserListResponse = mockUserList.map((user) => pick(user, ...userInfoSelectFields));
