import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL env var is required');
  process.exit(1);
}

const isRemote = DATABASE_URL.includes('render.com') || DATABASE_URL.includes('frankfurt') || DATABASE_URL.includes('dpg-');

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Adding role column to users table...');
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
    `);

    const adminPhone = process.env.ADMIN_PHONE || '+14377331689';
    console.log(`Setting admin role for phone: ${adminPhone}`);
    const result = await client.query(
      `UPDATE users SET role = 'admin' WHERE phone = $1 RETURNING id, name, phone, role`,
      [adminPhone]
    );

    if (result.rows.length === 0) {
      console.log('WARNING: No user found with that phone number.');
      const users = await client.query(
        'SELECT id, name, phone, created_at FROM users ORDER BY created_at DESC LIMIT 20'
      );
      console.log('Recent users in DB:', users.rows);
    } else {
      console.log('Admin user updated:', result.rows[0]);
    }

    await client.query('COMMIT');

    const check = await client.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    console.log(`Total admin users: ${check.rows[0].count}`);
    console.log('Migration complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
