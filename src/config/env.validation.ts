import { config } from 'dotenv';
  config();

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().positive().default(7000),

  REDIS_USERNAME: z.string().default('default'),
  REDIS_PASSWORD: z.string().min(1, 'REDIS_PASSWORD is required'),
  REDIS_HOST: z.string().min(1, 'REDIS_HOST is required'),
  REDIS_PORT: z.coerce.number().int().positive(),
  SESSION_SECRET: z
    .string()
    .min(5, 'SESSION_SECRET must be at least 5 characters long'),
  DATABASE_URL: z.string(),
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().email('SMTP_USER must be a valid email'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),
  SMTP_FROM: z.string().min(1, 'SMTP_FROM is required'),
  APP_DOMAIN: z.string().url(),
  DEBUG_MODE: z.enum(['false', 'true']).transform((val) => val === 'true'),
});

type Env = z.infer<typeof envSchema>;

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:\n', parsedEnv.error.format());
  throw new Error(
    'Invalid environment variables:\n' +
      JSON.stringify(parsedEnv.error.format(), null, 2),
  );
}

export const env: Env = parsedEnv.data;
