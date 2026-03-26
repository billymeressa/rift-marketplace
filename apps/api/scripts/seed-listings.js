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
  { phone: '+251955500005', name: 'Abebe Girma',     lang: 'am' },
  { phone: '+251966600006', name: 'Fatuma Wako',     lang: 'om' },
];

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

    const T = userIds['Tigist Haile'];
    const M = userIds['Mohammed Ahmed'];
    const D = userIds['Dawit Bekele'];
    const S = userIds['Sara Tesfaye'];
    const A = userIds['Abebe Girma'];
    const F = userIds['Fatuma Wako'];

    // 3. Insert sample listings
    console.log('📦 Inserting sample listings…');

    const listings = [

      // ── SELL — Coffee ────────────────────────────────────────────────────────
      {
        userId: T, type: 'sell', productCategory: 'coffee', region: 'sidama',
        title: 'Grade 1 Sidama Washed Coffee — Export Ready',
        description: 'Premium washed Sidama coffee, Grade 1. Dried on raised beds for 18–21 days. Moisture content 11.5%, screen size 15+. Ready for export with full ECX documentation. SGS inspection available. Minimum order 20 quintals. Price is per quintal FOB Djibouti.',
        grade: 1, process: 'washed', transactionType: 'spot',
        quantity: '120', unit: 'quintals', price: '58000', currency: 'ETB',
        images: [
          'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800',
          'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
        ],
      },
      {
        userId: T, type: 'sell', productCategory: 'green_coffee', region: 'snnpr',
        title: 'Yirgacheffe Natural Coffee — Grade 2, 30 Bags',
        description: 'Sun-dried natural process Yirgacheffe from Gedeo zone, Grade 2. Fruity and floral cup profile with blueberry and jasmine notes. Dried on raised beds for 25 days, fully traceable to cooperative level. Available in 60 kg GrainPro bags. Cupping score 85+. Samples available on request.',
        grade: 2, process: 'natural', transactionType: 'spot',
        quantity: '30', unit: 'bags', price: '9500', currency: 'ETB',
        images: [
          'https://images.unsplash.com/photo-1611854779393-1b2da9d400fe?w=800',
          'https://images.unsplash.com/photo-1559525839-8a8fdeaf6f36?w=800',
        ],
      },
      {
        userId: M, type: 'sell', productCategory: 'roasted_coffee', region: 'addis_ababa',
        title: 'Roasted Ethiopian Coffee — Export Packaging, 2,000 kg',
        description: 'Medium-roasted Ethiopian single-origin blend (Sidama + Yirgacheffe), professionally packaged in 250 g and 500 g nitrogen-flushed, valve-sealed bags with custom label. Shelf life 18 months. Suitable for retail and food service export. MOQ 500 kg. HACCP certified facility. Available on forward contract.',
        grade: 1, process: 'roasted', transactionType: 'forward',
        quantity: '2000', unit: 'kg', price: '1200', currency: 'ETB',
        images: [
          'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800',
          'https://images.unsplash.com/photo-1521302080334-4bebac2763a6?w=800',
        ],
      },
      {
        userId: A, type: 'sell', productCategory: 'coffee', region: 'oromia',
        title: 'Guji Natural Coffee — Grade 1, 80 Quintals',
        description: 'Guji zone natural coffee, Grade 1 from Uraga woreda. Dark fruit and chocolate flavour profile. Screen 14+, moisture 11%. New 2025/26 crop, sorted and bagged at origin. ECX graded. Available for immediate shipment. Price per quintal, FOB Djibouti. Can arrange inland transport to Addis warehouse.',
        grade: 1, process: 'natural', transactionType: 'spot',
        quantity: '80', unit: 'quintals', price: '60000', currency: 'ETB',
        images: [
          'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=800',
        ],
      },

      // ── SELL — Oilseeds ──────────────────────────────────────────────────────
      {
        userId: M, type: 'sell', productCategory: 'sesame', region: 'amhara',
        title: 'Humera White Sesame — 5 FCL CNF Qingdao',
        description: 'White Humera sesame, new 2025/26 crop. Machine-cleaned and triple-sorted. 99/1 purity, moisture ≤6%, FFA ≤2%, oil content 52%. Available FOB Djibouti or CNF Qingdao. SGS pre-shipment inspection available at buyer\'s cost. COO, phyto and fumigation certificates provided. Price per MT.',
        grade: 1, process: 'processed', transactionType: 'spot',
        quantity: '5', unit: 'fcl', price: '1180', currency: 'USD',
        images: [
          'https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?w=800',
          'https://images.unsplash.com/photo-1556909212-29c14e0c8c1e?w=800',
        ],
      },
      {
        userId: D, type: 'sell', productCategory: 'niger_seed', region: 'amhara',
        title: 'Niger Seed (Noug) — Grade 1, 80 Quintals, Gojjam',
        description: 'High-oil content Niger seed (Guizotia abyssinica) from Gojjam highlands. Cleaned and hand-sorted. Oil content 38–40%, moisture 7%, purity 98%. Available in 50 kg polypropylene bags. Suitable for bird food export (EU, UK, US) and oil extraction. Price per quintal. Can consolidate with other oilseeds.',
        grade: 1, process: 'raw', transactionType: 'spot',
        quantity: '80', unit: 'quintals', price: '14500', currency: 'ETB',
        images: [
          'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800',
        ],
      },
      {
        userId: S, type: 'sell', productCategory: 'linseed', region: 'amhara',
        title: 'Linseed / Flaxseed — 30 Tons Export Quality, Gondar',
        description: 'Brown linseed from Gondar region, new crop. Oil content 40%+, moisture 8%, purity 98/2. Available in 50 kg woven bags or jumbo bags. FOB Djibouti price available on request. Phyto certificate and SGS inspection arranged. Regular supply of up to 500 MT/month possible. Long-term buyers welcome.',
        grade: 2, process: 'raw', transactionType: 'spot',
        quantity: '30', unit: 'tons', price: '42000', currency: 'ETB',
        images: [
          'https://images.unsplash.com/photo-1599940778173-e276d4acb2bb?w=800',
        ],
      },
      {
        userId: F, type: 'sell', productCategory: 'sesame', region: 'tigray',
        title: 'Setit-Humera Sesame — Mixed Grade, 3 FCL FOB Djibouti',
        description: 'Sesame from Setit-Humera farming cooperative, mixed Grade 1/2. White variety. Moisture ≤7%, purity 98/2, oil content 50%+. New harvest. Available immediately for spot shipment. 3 FCL in 25 kg bags. FOB Djibouti pricing. Can arrange SGS/Cotecna inspection. Regular supply through 2026.',
        grade: 2, process: 'processed', transactionType: 'spot',
        quantity: '3', unit: 'fcl', price: '1050', currency: 'USD',
        images: [
          'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800',
        ],
      },

      // ── SELL — Pulses & Legumes ───────────────────────────────────────────────
      {
        userId: D, type: 'sell', productCategory: 'lentils', region: 'oromia',
        title: 'Red Lentils — Grade 2, 50 Tons, Arsi-Bale',
        description: 'Red lentils from Arsi-Bale zone, machine-cleaned and polished, 98% purity. Moisture 12%, split free 95%. Suitable for Middle East and Asian markets. Available in 25 kg bags or 50 kg bags. Delivery from Addis Ababa warehouse within 5 days. Phyto certificate available. Price per ton.',
        grade: 2, process: 'processed', transactionType: 'spot',
        quantity: '50', unit: 'tons', price: '48500', currency: 'ETB',
        images: [
          'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?w=800',
          'https://images.unsplash.com/photo-1602634373832-c54bbf80a91f?w=800',
        ],
      },
      {
        userId: T, type: 'sell', productCategory: 'chickpea', region: 'oromia',
        title: 'Desi Chickpea — New Crop 2025/26, 3 FCL FOB',
        description: 'Desi chickpea (Cicer arietinum) from Shashemene woreda, new 2025/26 crop. Bold size (8mm+), 98/2 purity, moisture 13%, weevil-free. Available immediately. CIF destination pricing for 3 FCL minimum. 50 kg woven PP bags. Phyto, fumigation and quality certificates provided. Samples on request.',
        grade: 1, process: 'processed', transactionType: 'forward',
        quantity: '3', unit: 'fcl', price: '620', currency: 'USD',
        images: [
          'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?w=800',
        ],
      },
      {
        userId: M, type: 'sell', productCategory: 'kidney_bean', region: 'amhara',
        title: 'Red Kidney Beans — Gojjam Long Shape, 5 FCL',
        description: 'Premium Gojjam red kidney beans, new crop. Long shape, bright uniform red colour — highly preferred in EU and US markets. Machine cleaned, 99/1 purity, moisture 14%, screen 9mm+. Available for immediate loading. FOB Djibouti in 50 kg bags. SGS pre-shipment inspection available. Samples sent free of charge.',
        grade: 1, process: 'processed', transactionType: 'spot',
        quantity: '5', unit: 'fcl', price: '780', currency: 'USD',
        images: [
          'https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=800',
        ],
      },
      {
        userId: A, type: 'sell', productCategory: 'faba_bean', region: 'amhara',
        title: 'Faba Beans (Ful) — 60 Tons, Gojjam, New Crop',
        description: 'Large-seeded faba beans from Gojjam zone. New 2025/26 harvest. Machine-cleaned, 98% purity, moisture 13.5%, 1000-seed weight 650 g+. Suitable for Egyptian and Middle East ful mudammas market. Available in 50 kg woven bags. Price per ton delivered Addis Ababa. Can supply up to 200 tons/month.',
        grade: 1, process: 'processed', transactionType: 'spot',
        quantity: '60', unit: 'tons', price: '32000', currency: 'ETB',
        images: [
          'https://images.unsplash.com/photo-1599940778173-e276d4acb2bb?w=800',
        ],
      },

      // ── SELL — Spices & Specialty ─────────────────────────────────────────────
      {
        userId: S, type: 'sell', productCategory: 'korarima', region: 'south_west',
        title: 'Ethiopian Cardamom (Korarima) — 500 kg, Kafa Zone',
        description: 'Authentic Ethiopian cardamom (Korarima / Aframomum corrorima) from Kafa zone wild forests. Hand-picked, sun-dried. Whole pods, uniform brown colour, premium aroma — rich warm spice profile. Available in 25 kg jute bags. Highly sought after in Gulf, EU and US specialty spice markets. Moisture ≤12%, essential oil 2%+.',
        grade: 1, process: 'dried', transactionType: 'spot',
        quantity: '500', unit: 'kg', price: '1800', currency: 'ETB',
        images: [
          'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800',
          'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800',
        ],
      },
      {
        userId: D, type: 'sell', productCategory: 'frankincense', region: 'amhara',
        title: 'Boswellia Frankincense — 2 Tons Grade A, North Ethiopia',
        description: 'Pure Boswellia papyrifera frankincense resin from North Gondar highlands. Grade A large tears (10–25 mm), white to pale yellow, high boswellic acid content. Sustainably harvested. Used for incense, cosmetics, and pharmaceutical export. MOQ 500 kg. Available in 25 kg cartons. Price per kg.',
        grade: 1, process: 'raw', transactionType: 'spot',
        quantity: '2000', unit: 'kg', price: '3800', currency: 'USD',
        images: [
          'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=800',
        ],
      },
      {
        userId: T, type: 'sell', productCategory: 'honey', region: 'snnpr',
        title: 'Forest Honey — Certified Organic, 500 kg, Kafa Zone',
        description: 'Wild forest honey from Kafa UNESCO Biosphere Reserve. Unpasteurized, raw, unfiltered. Dark amber colour, strong aromatic profile with floral and woody notes. Beeswax-free. Organic certification available (EU standard). Moisture ≤18%, HMF ≤40 mg/kg, diastase 8+. Suitable for premium food export. Price per kg.',
        grade: 1, process: 'organic', transactionType: 'spot',
        quantity: '500', unit: 'kg', price: '950', currency: 'ETB',
        images: [
          'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800',
          'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800',
        ],
      },
      {
        userId: F, type: 'sell', productCategory: 'beeswax', region: 'oromia',
        title: 'Natural Beeswax — 200 kg, Arsi Zone, Yellow Grade A',
        description: 'Natural yellow beeswax from Arsi zone highland beekeepers cooperative. Grade A, clean filtered, melting point 62–65°C, free of impurities. Used for cosmetics, candles, pharmaceuticals and food-grade wax. Available in 5 kg blocks or 1 kg discs. Moisture ≤0.3%. Kosher and halal compliant. Price per kg.',
        grade: 1, process: 'processed', transactionType: 'spot',
        quantity: '200', unit: 'kg', price: '1200', currency: 'ETB',
        images: [
          'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800',
        ],
      },

      // ── SELL — Livestock & Fresh ──────────────────────────────────────────────
      {
        userId: M, type: 'sell', productCategory: 'cattle', region: 'somali',
        title: 'Ogaden Cattle — 30 Head for Gulf Export',
        description: 'Healthy Ogaden breed cattle, 3–5 years old, average live weight 350–400 kg. All animals vaccinated (FMD, BQ, Anthrax) and vet-certified. Suitable for halal slaughter export to Gulf markets via Berbera or Djibouti port. Export permit available. Price per head. Inspection welcome at farm in Jigjiga.',
        grade: 1, process: 'live', transactionType: 'spot',
        quantity: '30', unit: 'head', price: '28000', currency: 'ETB',
        images: [
          'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=800',
        ],
      },
      {
        userId: S, type: 'sell', productCategory: 'avocado', region: 'oromia',
        title: 'Fresh Hass Avocado — 10 Tons, Wolega, Export Grade',
        description: 'Hass variety avocado from Gimbi woreda, West Wolega. Harvest-ready in 2 weeks. Size 18–24, uniform dark skin, Brix 8–10%. No disease marks. Suitable for EU airfreight export with phytosanitary certificate from MoA inspection. Pre-cooling facility available. Min order 5 tons. Price per kg.',
        grade: 1, process: 'fresh', transactionType: 'spot',
        quantity: '10000', unit: 'kg', price: '85', currency: 'ETB',
        images: [
          'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800',
          'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800',
        ],
      },
      {
        userId: A, type: 'sell', productCategory: 'mango', region: 'snnpr',
        title: 'Keitt Mango — 5 Tons, Arba Minch, Export Ready',
        description: 'Keitt variety mangoes from Arba Minch orchards. Late-season variety, large size (500–800 g), bright red-yellow skin, very low fibre. Packaged in 4 kg cartons for export. Phyto certificate from plant protection directorate. Pre-cooling available. Cold chain to Addis Ababa possible. Min order 1 ton.',
        grade: 1, process: 'fresh', transactionType: 'spot',
        quantity: '5000', unit: 'kg', price: '55', currency: 'ETB',
        images: [
          'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800',
        ],
      },

      // ── BUY listings ─────────────────────────────────────────────────────────
      {
        userId: D, type: 'buy', productCategory: 'coffee', region: 'oromia',
        title: 'Seeking Grade 1 Washed Coffee — 200 Quintals',
        description: 'Licensed coffee exporter seeking Grade 1 washed or natural coffee from Yirgacheffe, Guji, or Sidama origins. ECX graded preferred. Moisture ≤12%. Full payment within 3 days of ECX release. Serious sellers with export licence please contact. Price negotiable based on cupping. Can collect from ECX warehouse.',
        grade: 1, process: 'washed', transactionType: 'spot',
        quantity: '200', unit: 'quintals', price: '55000', currency: 'ETB',
        images: [],
      },
      {
        userId: S, type: 'buy', productCategory: 'sesame', region: 'amhara',
        title: 'Sesame Buyer — 2 FCL, Humera or Mixed Origin',
        description: 'Established exporter seeking white sesame, Humera or mixed origin. CNF Qingdao or FOB Djibouti basis. Ready to sign sales contract immediately. Must have phyto certificate and SGS or Cotecna quality report. Payment by LC at sight. Price up to 1,100 USD/MT CNF. Will consider Grade 1 and Grade 2.',
        grade: 1, process: 'processed', transactionType: 'spot',
        quantity: '2', unit: 'fcl', price: '1100', currency: 'USD',
        images: [],
      },
      {
        userId: T, type: 'buy', productCategory: 'lentils', region: 'oromia',
        title: 'Bulk Lentil Buyer — 100 Tons Monthly, Long-Term',
        description: 'Domestic food processor (pasta and packaged food factory) seeking red and green lentils on a recurring monthly basis. Requirement: 100 MT/month minimum. Clean, machine-processed, moisture ≤13%. 12-month supply contract preferred. All origins in Ethiopia considered. Price ETB/ton, delivered to our Addis Ababa factory.',
        grade: 2, process: 'processed', transactionType: 'forward',
        quantity: '100', unit: 'tons', price: '46000', currency: 'ETB',
        images: [],
      },
      {
        userId: M, type: 'buy', productCategory: 'frankincense', region: 'amhara',
        title: 'Frankincense Buyer — 500 kg Min, Grade A',
        description: 'International aromatics buyer (UAE) seeking Boswellia papyrifera or serrata frankincense from Ethiopia. Grade A large tears preferred. Minimum 500 kg per shipment, up to 2 MT. Regular monthly orders available for reliable supplier. Payment T/T 30% advance, 70% on BL. Price based on quality inspection. Lab test results required.',
        grade: 1, process: 'raw', transactionType: 'forward',
        quantity: '500', unit: 'kg', price: '3200', currency: 'USD',
        images: [],
      },
      {
        userId: F, type: 'buy', productCategory: 'honey', region: 'snnpr',
        title: 'Organic Honey Buyer — 1,000 kg per Month, EU Export',
        description: 'EU-licensed honey importer seeking reliable Ethiopian organic honey supplier. 1,000 kg/month minimum. Must be certified organic (PGS or third-party), moisture ≤18%, HMF ≤15 mg/kg, C4 sugar ≤7%. Suitable for German and Dutch specialty retail. Will consider raw and filtered grades. Price per kg, FOB Addis Ababa airport.',
        grade: 1, process: 'organic', transactionType: 'forward',
        quantity: '1000', unit: 'kg', price: '1100', currency: 'ETB',
        images: [],
      },
      {
        userId: A, type: 'buy', productCategory: 'cattle', region: 'oromia',
        title: 'Cattle Buyer — 50 Head for Fattening, East Hararghe',
        description: 'Looking for young male cattle (2–3 years, 150–250 kg live weight) for fattening operation in East Hararghe zone. Oromia, Somali or SNNPR origin preferred. Animals must be healthy with vet clearance. Price based on live weight at delivery. Can arrange own transport. Ongoing purchase — 50 head every 45 days.',
        grade: 1, process: 'live', transactionType: 'spot',
        quantity: '50', unit: 'head', price: '18000', currency: 'ETB',
        images: [],
      },

    ];

    let count = 0;
    for (const l of listings) {
      await client.query(
        `INSERT INTO listings
          (user_id, type, product_category, region, title, description,
           grade, process, transaction_type, quantity, unit, price, currency,
           images, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active')`,
        [
          l.userId, l.type, l.productCategory, l.region ?? null,
          l.title, l.description,
          l.grade ?? null, l.process, l.transactionType,
          l.quantity, l.unit, l.price, l.currency,
          JSON.stringify(l.images),
        ]
      );
      count++;
      console.log(`  ✅ [${l.type.toUpperCase()}] ${l.title.slice(0, 60)}`);
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
