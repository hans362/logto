import type { UsersRole } from '@logto/schemas';
import { UsersRoles } from '@logto/schemas';
import { convertToIdentifiers } from '@logto/shared';
import { sql } from 'slonik';

import envSet from '#src/env-set/index.js';

const { table, fields } = convertToIdentifiers(UsersRoles);

export const insertUsersRoles = async (usersRoles: UsersRole[]) =>
  envSet.pool.query(sql`
    insert into ${table} (${fields.userId}, ${fields.roleId}) values
    ${sql.join(
      usersRoles.map(({ userId, roleId }) => sql`(${userId}, ${roleId})`),
      sql`, `
    )}
  `);

export const deleteUsersRolesByUserIdAndRoleId = async (userId: string, roleId: string) => {
  await envSet.pool.query(sql`
    delete from ${table}
    where ${fields.userId} = ${userId} and ${fields.roleId} = ${roleId}
  `);
};
