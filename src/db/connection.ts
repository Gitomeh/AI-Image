import { Pool } from 'pg';
import { config } from '../config/env';

const pool = new Pool({
  connectionString: config.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export { pool };
