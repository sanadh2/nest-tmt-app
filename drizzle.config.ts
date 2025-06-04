import { Config } from 'drizzle-kit';
import { env } from 'src/config/env.validation';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  schema: './src/drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
} satisfies Config;
