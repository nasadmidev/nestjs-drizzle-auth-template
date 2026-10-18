import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { pgTable, text, uuid, pgEnum, timestamp } from 'drizzle-orm/pg-core';
import { relations } from './relations';

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export const roleEnum = pgEnum('role', Role);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  email: text('email').unique().notNull(),
  role: roleEnum().notNull(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type DrizzleDatabase = NodePgDatabase<typeof relations>;
export type User = typeof users.$inferSelect;
export type CreateUser = typeof users.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type CreateRefreshToken = typeof refreshTokens.$inferInsert;
