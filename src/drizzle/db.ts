import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.validation';

const connectionString = env.DATABASE_URL;

const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client);
