/**
 * Startup migration script.
 * Applies schema changes that drizzle-kit push may miss.
 * Safe to run repeatedly — all statements use IF NOT EXISTS / IF EXISTS guards.
 */
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const migrations = [
  // TMA support: add telegramId + telegramUsername, make phone nullable
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id    VARCHAR(30)  UNIQUE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(50)`,
  `ALTER TABLE users ALTER COLUMN phone DROP NOT NULL`,
];

async function run() {
  const client = await pool.connect();
  try {
    for (const sql of migrations) {
      try {
        await client.query(sql);
        console.log(`✅ Migration OK: ${sql.slice(0, 60)}...`);
      } catch (err) {
        // Ignore "already exists" type errors
        if (err.code === '42701' || err.code === '42P07') {
          console.log(`⏭  Already applied: ${sql.slice(0, 60)}...`);
        } else {
          console.error(`❌ Migration failed: ${sql}\n   ${err.message}`);
        }
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Migration script error:', err);
  process.exit(1);
});
