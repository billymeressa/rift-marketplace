/**
 * Startup migration script.
 * Applies schema changes safely using IF NOT EXISTS guards.
 * Safe to run on every startup.
 */
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set — skipping migrations');
  process.exit(0); // non-fatal: let the server start anyway
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const migrations = [
  // TMA support
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id VARCHAR(30)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(50)`,
  `ALTER TABLE users ALTER COLUMN phone DROP NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_id_key ON users(telegram_id) WHERE telegram_id IS NOT NULL`,
];

async function run() {
  const client = await pool.connect();
  try {
    for (const sql of migrations) {
      await client.query(sql);
      console.log(`✅ ${sql.slice(0, 70)}`);
    }
    console.log('✅ All migrations complete');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
