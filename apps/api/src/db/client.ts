import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const isProduction = process.env.NODE_ENV === 'production';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

// Warm up the connection pool on startup so the first request never fails
pool.connect()
  .then(client => { client.release(); console.log('Database connected'); })
  .catch(err => console.error('Database connection failed:', err.message));

export const db = drizzle(pool, { schema });
