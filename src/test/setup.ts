import { config } from 'dotenv';
import { vi } from 'vitest';

// Load test environment variables
config({ path: '.env.test' });

// Mock environment variables for tests
process.env.PORT = '3000';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.GEMINI_API_KEY = 'test_api_key';
process.env.VISION_MODEL = 'gemini-2.0-flash-vision';
process.env.EMBEDDING_MODEL = 'text-embedding-004';
process.env.SIMILARITY_THRESHOLD = '0.75';
process.env.CONFIDENCE_THRESHOLD = '0.80';
process.env.MAX_AI_COST = '10.00';
process.env.MAX_RETRY_ATTEMPTS = '3';
process.env.JOB_TIMEOUT_MS = '300000';

// Mock config module
vi.mock('../config/env', () => ({
  config: {
    PORT: 3000,
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
    GEMINI_API_KEY: 'test_api_key',
    VISION_MODEL: 'gemini-2.0-flash-vision',
    EMBEDDING_MODEL: 'text-embedding-004',
    SIMILARITY_THRESHOLD: 0.75,
    CONFIDENCE_THRESHOLD: 0.80,
    MAX_AI_COST: 10.00,
    MAX_RETRY_ATTEMPTS: 3,
    JOB_TIMEOUT_MS: 300000
  }
}));
