import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: varchar('id', { length: 24 }).primaryKey(),
  email: varchar('email', { length: 256 }).unique().notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  password: varchar('password').notNull(),
  username: varchar('username', { length: 256 }).unique(),
  isVerified: boolean().default(false).notNull(),
  isDeleted: boolean().default(false).notNull(),
});

export type User = InferSelectModel<typeof users>;

export type CreateUser = Omit<
  InferInsertModel<typeof users>,
  'id' | 'createdAt'
>;

export type UpdateUser = Partial<CreateUser> & { id: string };

export type PublicUser = Omit<User, 'password' | 'isVerified' | 'isDeleted'>;
