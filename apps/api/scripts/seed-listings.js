/**
 * Seed script — clears all listings and populates with realistic sample data.
 * Safe to re-run: deletes everything in the right order first.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/seed-listings.js
 */
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Seed users (upserted by phone so they're idempotent) ────────────────────

const SEED_USERS = [
  { phone: '+251911100001', name: 'Tigist Haile',    lang: 'am' },
  { phone: '+251922200002', name: 'Mohammed Ahmed',  lang: 'am' },
  { phone: '+251933300003', name: 'Dawit Bekele',    lang: 'om' },
  { phone: '+251944400004', name: 'Sara Tesfaye',    lang: 'am' },
];

// ─── Sample listings ─────────────────────────────────────────────────────────
// Populated after we resolve seller user IDs below.

async function run() {
  const client = await pool.connect();
  try {
    // 1. Delete in dependency order
    console.log('🗑  Clearing dependent tables…');
    await client.query(`DELETE FROM messages`);
    await client.query(`DELETE FROM conversations`);
    await client.query(`DELETE FROM reviews`);
    await client.query(`DELETE FROM orders`);
    await client.query(`DELETE FROM listings`);
    console.log('✅ All listings (and dependent rows) cleared');

    // 2. Upsert seed users
    console.log('👤 Upserting seed users…');
    const userIds = {};
    for (const u of SEED_USERS) {
      const { rows } = await client.query(
        `INSERT INTO users (phone, name, preferred_language)
         VALUES ($1, $2, $3)
         ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, name`,
        [u.phone, u.name, u.lang]
      );
      userIds[u.name] = rows[0].id;
      console.log(`  ✅ ${rows[0].name} (${rows[0].id})`);
    }

    // Also grab the first real user (developer account) to use as a seller
    const { rows: devRows } = await client.query(
      `SELECT id FROM users WHERE phone = '+251989594092' LIMIT 1`
    );
    const devId = devRows[0]?.id;

    const T = userIds['Tigist Haile'];
    const M = userIds['Mohammed Ahmed'];
    const D = userIds['Dawit Bekele'];
    const S = userIds['Sara Tesfaye'];

    // 3. Insert sample listings
    console.log('📦 Inserting sample listings…');

    const listings = [
      // ── SELL — Coffee ────────────────────────────────────────────────────────
      {
        userId: T, type: 'sell', productCategory: 'coffee', region: 'sidama',
        title: 'Grade 1 Sidama Washed Coffee — Export Ready',
        description: 'Premium washed Sidama coffee, Grade 1. Dried on raised beds, moisture content 11.5%. Ready for export with full documentation. Minimum order 20 quintals.',
        grade: 1, process: 'washed', transactionType: 'spot',
        quantity: '120', unit: 'quintals', price: '58000', currency: 'ETB',
      },
      {
        userId: T, type: 'sell', productCategory: 'green_coffee', region: 'oromia',
        title: 'Yirgacheffe Natural Coffee — Grade 2',
        description: 'Sun-dried natural process Yirgacheffe, fruity and floral profile. Ideal for specialty roasters. Available in 60 kg GrainPro bags.',
        grade: 2, process: 'natural', transactionType: 'spot',
        quantity: '30', unit: 'bags', price: '9500', currency: 'ETB',
      },
      {
        userId: M, type: 'sell', productCategory: 'roasted_coffee', region: 'addis_ababa',
        title: 'Roasted Ethiopian Coffee — Export Quality Packaging',
        description: 'Medium-roasted Ethiopian blend, professionally packaged in 250g and 500g vacuum-sealed bags. Available for bulk export orders. MOQ: 500 kg.',
        grade: 1, process: 'processed', transactionType: 'forward',
        quantity: '2000', unit: 'kg', price: '1200', currency: 'ETB',
      },

      // ── SELL — Oilseeds ──────────────────────────────────────────────────────
      {
        userId: M, type: 'sell', productCategory: 'sesame', region: 'amhara',
        title: 'Humera Sesame — 5 FCL CNF Qingdao',
        description: 'White Humera sesame, new crop. Cleaned and sorted, 99/1 purity. Moisture ≤6%. Available on FOB Djibouti or CNF Qingdao. SGS inspection available.',
        grade: 1, process: 'processed', transactionType: 'spot',
        quantity: '5', unit: 'fcl', price: '1180', currency: 'USD',
      },
      {
        userId: D, type: 'sell', productCategory: 'niger_seed', region: 'amhara',
        title: 'Niger Seed (Noug) — Grade 1, 80 Quintals',
        description: 'High-oil content Niger seed from Gojjam. Cleaned, moisture 7%. Available for domestic and export markets. Serious buyers only.',
        grade: 1, process: 'raw', transactionType: 'spot',
        quantity: '80', unit: 'quintals', price: '14500', currency: 'ETB',
      },
      {
        userId: S, type: 'sell', productCategory: 'linseed', region: 'amhara',
        title: 'Linseed / Flaxseed — 30 Tons Export Quality',
        description: 'Clean linseed from Gondar region. Oil content 40%+. Available in 50 kg bags or bulk. FOB Djibouti price available on request.',
        grade: 2, process: 'raw', transactionType: 'spot',
        quantity: '30', unit: 'tons', price: '42000', currency: 'ETB',
      },

      // ── SELL — Pulses & Legumes ───────────────────────────────────────────────
      {
        userId: D, type: 'sell', productCategory: 'lentils', region: 'oromia',
        title: 'Red Lentils — Grade 2, 50 Tons Available',
        description: 'Red lentils from Arsi-Bale zone, machine-cleaned, 98% purity. Moisture 12%. Suitable for Middle East and Asian markets. Delivery from Addis warehouse.',
        grade: 2, process: 'processed', transactionType: 'spot',
        quantity: '50', unit: 'tons', price: '48500', currency: 'ETB',
      },
      {
        userId: T, type: 'sell', productCategory: 'chickpea', region: 'oromia',
        title: 'Desi Chickpea — New Crop, 3 FCL',
        description: 'Desi chickpea from Shashemene, new 2025/26 crop. Bold size, 98/2 purity, moisture 13%. CIF destination available for 3 FCL minimum.',
        grade: 1, process: 'processed', transactionType: 'forward',
        quantity: '3', unit: 'fcl', price: '620', currency: 'USD',
      },
      {
        userId: M, type: 'sell', productCategory: 'kidney_bean', region: 'amhara',
        title: 'Red Kidney Beans — Gojjam Variety, 5 FCL',
        description: 'Premium Gojjam red kidney beans, new crop. Long shape, bright red colour. Machine cleaned. Moisture 14%. FOB Djibouti. Samples available.',
        grade: 1, process: 'processed', transactionType: 'spot',
        quantity: '5', unit: 'fcl', price: '780', currency: 'USD',
      },

      // ── SELL — Spices & Specialty ─────────────────────────────────────────────
      {
        userId: S, type: 'sell', productCategory: 'korarima', region: 'south_west',
        title: 'Ethiopian Cardamom (Korarima) — 500 kg',
        description: 'Authentic Ethiopian cardamom (Korarima / Aframomum corrorima). Hand-picked, sun-dried. Premium aroma. Available in 25 kg bags. Highly sought after in Gulf markets.',
        grade: 1, process: 'dried', transactionType: 'spot',
        quantity: '500', unit: 'kg', price: '1800', currency: 'ETB',
      },
      {
        userId: D, type: 'sell', productCategory: 'frankincense', region: 'tigray',
        title: 'Boswellia Frankincense — 2 Tons, Export Grade',
        description: 'Pure Boswellia papyrifera frankincense from Tigray highlands. Grade A, large tears. Used for incense and cosmetics export. MOQ 500 kg.',
        grade: 1, process: 'raw', transactionType: 'spot',
        quantity: '2', unit: 'tons', price: '3800', currency: 'USD',
      },
      {
        userId: T, type: 'sell', productCategory: 'honey', region: 'snnpr',
        title: 'Forest Honey — Organic, 500 kg',
        description: 'Wild forest honey from Kafa zone, beeswax-free, unpasteurized. Dark amber colour, strong aroma. Certified organic. Suitable for specialty food export.',
        grade: 1, process: 'organic', transactionType: 'spot',
        quantity: '500', unit: 'kg', price: '950', currency: 'ETB',
      },

      // ── SELL — Livestock & Fresh ──────────────────────────────────────────────
      {
        userId: M, type: 'sell', productCategory: 'cattle', region: 'somali',
        title: 'Ogaden Cattle — 30 Head for Export',
        description: 'Healthy Ogaden breed cattle, average weight 350–400 kg. Veterinary certificates available. Suitable for Gulf export via Berbera or Djibouti.',
        grade: null, process: 'raw', transactionType: 'spot',
        quantity: '30', unit: 'head', price: '28000', currency: 'ETB',
      },
      {
        userId: S, type: 'sell', productCategory: 'avocado', region: 'oromia',
        title: 'Fresh Hass Avocado — 10 Tons',
        description: 'Hass variety avocado from Wolega. Ready in 2 weeks. Size 18–24. Suitable for EU export with phytosanitary certificate. Min order 5 tons.',
        grade: 1, process: 'fresh', transactionType: 'spot',
        quantity: '10', unit: 'tons', price: '38', currency: 'ETB',
      },

      // ── BUY listings ─────────────────────────────────────────────────────────
      {
        userId: D, type: 'buy', productCategory: 'coffee', region: 'oromia',
        title: 'Looking for Grade 1 Washed Coffee — 200 Quintals',
        description: 'Coffee exporter seeking Grade 1 washed or natural coffee from Yirgacheffe, Guji, or Sidama origins. Serious sellers with export licence please contact. Price negotiable.',
        grade: 1, process: 'washed', transactionType: 'spot',
        quantity: '200', unit: 'quintals', price: '55000', currency: 'ETB',
      },
      {
        userId: S, type: 'buy', productCategory: 'sesame', region: 'amhara',
        title: 'Sesame Buyer — 2 FCL Humera or Mixed',
        description: 'Established exporter seeking white sesame, Humera or mixed origin. CNF Qingdao or FOB Djibouti. Ready to sign contract. Must have phyto certificate.',
        grade: 1, process: 'processed', transactionType: 'spot',
        quantity: '2', unit: 'fcl', price: '1100', currency: 'USD',
      },
      {
        userId: T, type: 'buy', productCategory: 'lentils', region: null,
        title: 'Bulk Lentil Buyer — 100 Tons Monthly',
        description: 'Domestic food processor seeking red and green lentils on a monthly basis. 100 tons/month requirement. Long-term contract preferred. All regions considered.',
        grade: 2, process: 'raw', transactionType: 'forward',
        quantity: '100', unit: 'tons', price: '46000', currency: 'ETB',
      },
      {
        userId: M, type: 'buy', productCategory: 'frankincense', region: null,
        title: 'Frankincense Buyer — 500 kg Min',
        description: 'International buyer seeking Boswellia frankincense. Minimum 500 kg per shipment. Grade A tears preferred. Price based on quality. Regular orders available.',
        grade: 1, process: 'raw', transactionType: 'forward',
        quantity: '500', unit: 'kg', price: '3200', currency: 'USD',
      },
      {
        userId: D, type: 'buy', productCategory: 'cattle', region: 'oromia',
        title: 'Cattle Buyer — 50 Head for Fattening',
        description: 'Looking for young cattle (2–3 years) for fattening operation in East Hararghe. Oromia, Somali or SNNPR origin. Price based on weight.',
        grade: null, process: 'raw', transactionType: 'spot',
        quantity: '50', unit: 'head', price: '22000', currency: 'ETB',
      },
    ];

    let count = 0;
    for (const l of listings) {
      await client.query(
        `INSERT INTO listings
          (user_id, type, product_category, region, title, description,
           grade, process, transaction_type, quantity, unit, price, currency,
           images, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'[]','active')`,
        [
          l.userId, l.type, l.productCategory, l.region ?? null,
          l.title, l.description,
          l.grade ?? null, l.process, l.transactionType,
          l.quantity, l.unit, l.price, l.currency,
        ]
      );
      count++;
      console.log(`  ✅ [${l.type.toUpperCase()}] ${l.title.slice(0, 55)}`);
    }

    console.log(`\n✅ Seeded ${count} listings across ${SEED_USERS.length} sellers`);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
