import { pgTable, text, uuid, pgEnum, timestamp } from 'drizzle-orm/pg-core';

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

const roleEnum = pgEnum('role', Role);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  email: text('email').unique().notNull(),
  role: roleEnum(),
  password: text('password').notNull(),
  createdAt: timestamp().defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type CreateUser = typeof users.$inferInsert;
