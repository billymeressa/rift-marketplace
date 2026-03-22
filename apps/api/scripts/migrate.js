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

  // Commodity price dashboard
  `CREATE TABLE IF NOT EXISTS commodity_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commodity VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    price DECIMAL NOT NULL,
    prev_price DECIMAL,
    currency VARCHAR(5) NOT NULL DEFAULT 'USD',
    unit VARCHAR(30) NOT NULL,
    trade_term VARCHAR(20),
    market VARCHAR(100),
    source VARCHAR(100),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  )`,

  // Seed initial prices from channel data (ON CONFLICT DO NOTHING — preserves admin updates)
  `INSERT INTO commodity_prices (commodity, label, price, prev_price, currency, unit, trade_term, market, source) VALUES
    ('coffee_ice',      'Coffee (Arabica)',     2.95,   4.23,   'USD', 'per lb', 'NYSE/ICE', 'New York',       'ICE Futures'),
    ('coffee_ecta',     'Coffee (ECTA Min)',    2.80,   null,   'USD', 'per lb', 'ECTA',     'Ethiopia',       'ECTA Weekly'),
    ('sesame_qingdao',  'Sesame (Humera)',      13700,  null,   'RMB', 'per mt', 'CNF',      'Qingdao, China', 'Market Report'),
    ('soybeans_cif',    'Soybeans',            500,    null,   'USD', 'per ton','CIF',      'Africa',         'Market Report'),
    ('gum_arabic_cfr',  'Gum Arabic',          1175,   null,   'USD', 'per mt', 'CFR',      'Qingdao, China', 'Market Report'),
    ('kidney_beans',    'Red Kidney Beans',    null,   null,   'USD', 'per FCL','FOB',      'Djibouti',       'Trader Channel')
  ON CONFLICT (commodity) DO NOTHING`,
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
