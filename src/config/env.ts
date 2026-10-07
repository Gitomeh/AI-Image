import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  VISION_MODEL: z.string().default('gemini-2.0-flash-vision'),
  EMBEDDING_MODEL: z.string().default('text-embedding-004'),
  SIMILARITY_THRESHOLD: z.string().default('0.75').transform(Number),
  CONFIDENCE_THRESHOLD: z.string().default('0.80').transform(Number),
  MAX_AI_COST: z.string().default('10.00').transform(Number),
  MAX_RETRY_ATTEMPTS: z.string().default('3').transform(Number),
  JOB_TIMEOUT_MS: z.string().default('300000').transform(Number)
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment configuration:');
  console.error(parsedEnv.error.issues);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
  throw new Error('Invalid environment configuration');
}

export const config = parsedEnv.data;
