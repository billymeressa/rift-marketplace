/**
 * Seed script — 50 real-world Ethiopian agriculture export listings
 * Run with: npx tsx seed-listings.ts
 */
import pg from 'pg';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com')
    ? { rejectUnauthorized: false }
    : false,
});

// ─── Demo traders ─────────────────────────────────────────────────────────────
const DEMO_USERS = [
  { id: randomUUID(), name: 'Dawit Bekele',    phone: '+251911000001' },
  { id: randomUUID(), name: 'Tigist Haile',    phone: '+251922000002' },
  { id: randomUUID(), name: 'Abebe Girma',     phone: '+251933000003' },
  { id: randomUUID(), name: 'Rahel Tadesse',   phone: '+251944000004' },
  { id: randomUUID(), name: 'Yohannes Alemu',  phone: '+251955000005' },
  { id: randomUUID(), name: 'Mekdes Worku',    phone: '+251966000006' },
];

// ─── 50 listings ──────────────────────────────────────────────────────────────
function listings(userIds: string[]) {
  const u = (i: number) => userIds[i % userIds.length];
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

  return [
    // ── COFFEE (sell) ────────────────────────────────────────────────────────
    {
      userId: u(0), type: 'sell', productCategory: 'green_coffee', grade: 1,
      process: 'washed', transactionType: 'spot', region: 'sidama',
      quantity: 200, unit: 'quintals', price: 18500, currency: 'ETB',
      description: 'Premium Grade 1 washed Sidama coffee. Fully dried on raised beds. Moisture 11.5%. Screen size 15+. Ready for immediate export. Phytosanitary certificate available.',
      createdAt: daysAgo(1),
    },
    {
      userId: u(1), type: 'sell', productCategory: 'green_coffee', grade: 1,
      process: 'natural', transactionType: 'spot', region: 'oromia',
      quantity: 150, unit: 'quintals', price: 19200, currency: 'ETB',
      description: 'Yirgacheffe G1 natural process. Fruity, complex profile. Sun-dried on African beds 21–25 days. ECX lot available. Minimum 50 quintals per order.',
      createdAt: daysAgo(2),
    },
    {
      userId: u(2), type: 'sell', productCategory: 'green_coffee', grade: 2,
      process: 'washed', transactionType: 'forward', region: 'snnpr',
      quantity: 500, unit: 'quintals', price: 16800, currency: 'ETB',
      description: 'Kaffa Zone G2 washed coffee. Forward contract for next harvest (Oct–Dec). Fixed price, deliverable FOB Djibouti. Export license held. Sample available on request.',
      createdAt: daysAgo(3),
    },
    {
      userId: u(3), type: 'sell', productCategory: 'green_coffee', grade: 1,
      process: 'honey', transactionType: 'spot', region: 'sidama',
      quantity: 80, unit: 'quintals', price: 21000, currency: 'ETB',
      description: 'Rare honey-process Sidama single-origin. Limited supply. Cup score 86+. Specialty grade with full traceability to farm cooperative. Vacuum-packed GrainPro bags.',
      createdAt: daysAgo(4),
    },
    {
      userId: u(4), type: 'sell', productCategory: 'green_coffee', grade: 2,
      process: 'natural', transactionType: 'spot', region: 'oromia',
      quantity: 300, unit: 'quintals', price: 17500, currency: 'ETB',
      description: 'Guji Zone natural G2. Blueberry and dark chocolate notes. Consistent quality from 3 consecutive seasons. In-warehouse stock, immediate loading.',
      createdAt: daysAgo(5),
    },
    // ── SESAME (sell) ────────────────────────────────────────────────────────
    {
      userId: u(5), type: 'sell', productCategory: 'sesame', grade: 1,
      process: 'raw', transactionType: 'spot', region: 'tigray',
      quantity: 1000, unit: 'quintals', price: 9200, currency: 'ETB',
      description: 'Humera white sesame, Grade 1. Oil content 52–54%. FFA < 1.5%. Packed in 50kg jute bags. Fumigation certificate available. Can load full 40HQ container within 5 days.',
      createdAt: daysAgo(1),
    },
    {
      userId: u(0), type: 'sell', productCategory: 'sesame', grade: 2,
      process: 'raw', transactionType: 'spot', region: 'amhara',
      quantity: 600, unit: 'quintals', price: 8600, currency: 'ETB',
      description: 'Gondar sesame G2. Admixture < 2%. Moisture 6%. Sorted and cleaned mechanically. Price negotiable for orders above 300 quintals.',
      createdAt: daysAgo(6),
    },
    // ── NIGER SEED / NOUG ────────────────────────────────────────────────────
    {
      userId: u(1), type: 'sell', productCategory: 'niger_seed', grade: 1,
      process: 'raw', transactionType: 'spot', region: 'oromia',
      quantity: 400, unit: 'quintals', price: 7800, currency: 'ETB',
      description: 'Ethiopian niger seed (noug) Grade 1. Oil content 40%+. Moisture 8%. New harvest. All export documentation ready. Minimum order 100 quintals.',
      createdAt: daysAgo(7),
    },
    // ── CHICKPEA ─────────────────────────────────────────────────────────────
    {
      userId: u(2), type: 'sell', productCategory: 'chickpea', grade: 1,
      process: 'processed', transactionType: 'spot', region: 'oromia',
      quantity: 800, unit: 'quintals', price: 5400, currency: 'ETB',
      description: 'Desi chickpea, machine-cleaned and sorted. Protein 22%. Moisture 12%. 50kg polypropylene bags. Export-ready with phytosanitary certificate. Suitable for Indian market specs.',
      createdAt: daysAgo(2),
    },
    {
      userId: u(3), type: 'sell', productCategory: 'chickpea', grade: 2,
      process: 'raw', transactionType: 'forward', region: 'amhara',
      quantity: 1500, unit: 'quintals', price: 4900, currency: 'ETB',
      description: 'Kabuli chickpea forward contract. Large seed size (8mm+). Deliver Jan–Feb next year. Fixed price offer, partial advance acceptable. From certified cooperative.',
      createdAt: daysAgo(8),
    },
    // ── LENTILS ──────────────────────────────────────────────────────────────
    {
      userId: u(4), type: 'sell', productCategory: 'lentils', grade: 1,
      process: 'processed', transactionType: 'spot', region: 'amhara',
      quantity: 500, unit: 'quintals', price: 6200, currency: 'ETB',
      description: 'Red and green lentils, sorted grade 1. Protein 26%. Low admixture (<0.5%). Polished and graded by calibration machine. Ready for immediate loading.',
      createdAt: daysAgo(3),
    },
    // ── HARICOT BEAN ─────────────────────────────────────────────────────────
    {
      userId: u(5), type: 'sell', productCategory: 'haricot_bean', grade: 1,
      process: 'processed', transactionType: 'spot', region: 'oromia',
      quantity: 700, unit: 'quintals', price: 4600, currency: 'ETB',
      description: 'White Pea bean (navy bean) Grade 1. Moisture 14%. Admixture <1%. Hand-selected and machine-cleaned. Full 20ft container available (approx. 240 quintals per container).',
      createdAt: daysAgo(4),
    },
    // ── WHITE TEFF ───────────────────────────────────────────────────────────
    {
      userId: u(0), type: 'sell', productCategory: 'white_teff', grade: 1,
      process: 'raw', transactionType: 'spot', region: 'amhara',
      quantity: 300, unit: 'quintals', price: 8900, currency: 'ETB',
      description: 'Premium white teff, Gojam origin. Moisture 11%. Gluten-free certified. Popular in diaspora and European health food markets. Export license and health certificate included.',
      createdAt: daysAgo(2),
    },
    {
      userId: u(1), type: 'sell', productCategory: 'white_teff', grade: 2,
      process: 'raw', transactionType: 'spot', region: 'oromia',
      quantity: 500, unit: 'quintals', price: 7800, currency: 'ETB',
      description: 'White teff G2 from Arsi. Consistent quality. Bulk packing in 50kg bags. Willing to provide sample lot of 5 quintals for quality verification.',
      createdAt: daysAgo(9),
    },
    // ── LINSEED / FLAX ───────────────────────────────────────────────────────
    {
      userId: u(2), type: 'sell', productCategory: 'linseed', grade: 1,
      process: 'raw', transactionType: 'spot', region: 'amhara',
      quantity: 350, unit: 'quintals', price: 6500, currency: 'ETB',
      description: 'Ethiopian linseed (flaxseed) brown variety. Oil 38–40%. Moisture < 9%. Cleaned and sorted. EU phytosanitary compliant. Gonder region new harvest.',
      createdAt: daysAgo(5),
    },
    // ── SOYBEAN ──────────────────────────────────────────────────────────────
    {
      userId: u(3), type: 'sell', productCategory: 'soybean', grade: 1,
      process: 'raw', transactionType: 'spot', region: 'oromia',
      quantity: 1200, unit: 'quintals', price: 5100, currency: 'ETB',
      description: 'Non-GMO soybean, Arba Minch origin. Protein 40%+. Moisture 13%. Export specifications available. Large quantity in-warehouse, able to load within 3 days.',
      createdAt: daysAgo(6),
    },
    // ── FAVA BEAN ────────────────────────────────────────────────────────────
    {
      userId: u(4), type: 'sell', productCategory: 'fava_bean', grade: 1,
      process: 'processed', transactionType: 'spot', region: 'amhara',
      quantity: 400, unit: 'quintals', price: 4200, currency: 'ETB',
      description: 'Large-seeded fava bean. Tannin-free variety. Machine-cleaned, moisture 14%. Egyptian and Saudi markets preferred. Cert available. Min order 100 quintals.',
      createdAt: daysAgo(7),
    },
    // ── MUNG BEAN ────────────────────────────────────────────────────────────
    {
      userId: u(5), type: 'sell', productCategory: 'mung_bean', grade: 1,
      process: 'processed', transactionType: 'spot', region: 'oromia',
      quantity: 250, unit: 'quintals', price: 7200, currency: 'ETB',
      description: 'Green mung bean, hand-selected. Uniform size, high germination rate. Bright green colour. Mainly used for sprouting and noodle market. Indian market specs met.',
      createdAt: daysAgo(8),
    },
    // ── SUNFLOWER ────────────────────────────────────────────────────────────
    {
      userId: u(0), type: 'sell', productCategory: 'sunflower', grade: 1,
      process: 'raw', transactionType: 'spot', region: 'amhara',
      quantity: 600, unit: 'quintals', price: 5800, currency: 'ETB',
      description: 'Sunflower seed, confectionary type. Oil content 44%. Admixture <1%. New harvest from Metema. Price includes fumigation and 50kg packaging.',
      createdAt: daysAgo(3),
    },
    // ── GROUNDNUT ────────────────────────────────────────────────────────────
    {
      userId: u(1), type: 'sell', productCategory: 'groundnut', grade: 1,
      process: 'raw', transactionType: 'spot', region: 'oromia',
      quantity: 200, unit: 'quintals', price: 9800, currency: 'ETB',
      description: 'Blanched groundnut kernels, Spanish type. Aflatoxin tested (<4ppb). Oil 48%+. Packed in 25kg vacuum bags. Suitable for food processing and direct consumption.',
      createdAt: daysAgo(10),
    },
    // ── KORARIMA (Ethiopian cardamom) ────────────────────────────────────────
    {
      userId: u(2), type: 'sell', productCategory: 'korarima',
      process: 'dried', transactionType: 'spot', region: 'snnpr',
      quantity: 50, unit: 'quintals', price: 45000, currency: 'ETB',
      description: 'Korarima (Ethiopian cardamom / false cardamom) dried whole pods. Highly aromatic. Bonga forest origin. Organic wild-harvested. Limited annual supply. Prized by Middle East and Asian spice traders.',
      createdAt: daysAgo(2),
    },
    // ── BLACK CUMIN ──────────────────────────────────────────────────────────
    {
      userId: u(3), type: 'sell', productCategory: 'black_cumin',
      process: 'dried', transactionType: 'spot', region: 'amhara',
      quantity: 120, unit: 'quintals', price: 12000, currency: 'ETB',
      description: 'Tikur azmud (black cumin / nigella sativa). Moisture < 10%. Cleaned and sorted. Oil content 35%+. Popular in Middle East and North African markets. Bulk price, FOB Djibouti.',
      createdAt: daysAgo(5),
    },
    // ── FENUGREEK ────────────────────────────────────────────────────────────
    {
      userId: u(4), type: 'sell', productCategory: 'fenugreek',
      process: 'dried', transactionType: 'spot', region: 'amhara',
      quantity: 180, unit: 'quintals', price: 8500, currency: 'ETB',
      description: 'Ethiopian fenugreek (abish). Yellow seed, uniform size. Moisture 9%. Standard 50kg jute bags. Suitable for pharmaceutical and food industries. EU-certified exporter.',
      createdAt: daysAgo(6),
    },
    // ── GINGER ───────────────────────────────────────────────────────────────
    {
      userId: u(5), type: 'sell', productCategory: 'ginger',
      process: 'dried', transactionType: 'spot', region: 'sidama',
      quantity: 100, unit: 'quintals', price: 14500, currency: 'ETB',
      description: 'Dried split ginger, Sidama origin. Essential oil 1.8–2.2%. Low fibre content. Air-dried and sulphur-free. Gingerol content certified. Min order 20 quintals.',
      createdAt: daysAgo(4),
    },
    // ── TURMERIC ─────────────────────────────────────────────────────────────
    {
      userId: u(0), type: 'sell', productCategory: 'turmeric',
      process: 'processed', transactionType: 'spot', region: 'snnpr',
      quantity: 80, unit: 'quintals', price: 16000, currency: 'ETB',
      description: 'Ground turmeric powder, Wolaita origin. Curcumin 3.5–4%. Bright yellow colour. No added colour or starch. Food-grade stainless steel milling. EU/US import specs met.',
      createdAt: daysAgo(7),
    },
    // ── HONEY ────────────────────────────────────────────────────────────────
    {
      userId: u(1), type: 'sell', productCategory: 'honey',
      process: 'raw', transactionType: 'spot', region: 'tigray',
      quantity: 60, unit: 'quintals', price: 32000, currency: 'ETB',
      description: 'Raw wild forest honey, Tigray highlands. Moisture < 18%. HMF < 15mg/kg. No antibiotics, naturally harvested from cliff hives. Suitable for organic certification. Glass jar packing available.',
      createdAt: daysAgo(3),
    },
    {
      userId: u(2), type: 'sell', productCategory: 'honey',
      process: 'raw', transactionType: 'spot', region: 'amhara',
      quantity: 40, unit: 'quintals', price: 28000, currency: 'ETB',
      description: 'Teff-blossom honey from Gojam, light amber colour. Mild taste. Kosher and halal suitable. Packed in 25kg food-grade plastic drums. Lab analysis certificate provided.',
      createdAt: daysAgo(9),
    },
    // ── FRANKINCENSE ─────────────────────────────────────────────────────────
    {
      userId: u(3), type: 'sell', productCategory: 'frankincense',
      process: 'raw', transactionType: 'spot', region: 'tigray',
      quantity: 30, unit: 'quintals', price: 38000, currency: 'ETB',
      description: 'Boswellia papyrifera (Tigray frankincense). Grade A tears, >80% purity. Pale yellow, woody-balsamic aroma. Popular with Arabic and European incense markets. Minimum order 5 quintals.',
      createdAt: daysAgo(2),
    },
    {
      userId: u(4), type: 'sell', productCategory: 'frankincense',
      process: 'raw', transactionType: 'spot', region: 'afar',
      quantity: 20, unit: 'quintals', price: 34000, currency: 'ETB',
      description: 'Boswellia neglecta (Ogaden frankincense). Dark resin, strong aroma. Afar region. Traditional harvest from mature trees. Suitable for perfumery and natural medicine markets.',
      createdAt: daysAgo(11),
    },
    // ── HIDES & SKINS ────────────────────────────────────────────────────────
    {
      userId: u(5), type: 'sell', productCategory: 'hides_skins',
      process: 'raw', transactionType: 'spot', region: 'oromia',
      quantity: 2000, unit: 'pieces', price: 1200, currency: 'ETB',
      description: 'Wet-salted cattle hides, Grade A. Average weight 25–30kg/piece. Sourced from licensed abattoirs. ERCA-cleared. Export to China, India and Italy. Full container loads available.',
      createdAt: daysAgo(4),
    },
    // ── MORINGA ──────────────────────────────────────────────────────────────
    {
      userId: u(0), type: 'sell', productCategory: 'moringa',
      process: 'dried', transactionType: 'spot', region: 'snnpr',
      quantity: 30, unit: 'quintals', price: 22000, currency: 'ETB',
      description: 'Organic moringa leaf powder. Protein 27%. Iron 28mg/100g. Shade-dried and milled at <40°C. EU organic certified. Packed in 10kg foil-laminated bags with nitrogen flush.',
      createdAt: daysAgo(5),
    },

    // ── BUYERS (Wanted listings) ─────────────────────────────────────────────
    {
      userId: u(1), type: 'buy', productCategory: 'green_coffee', grade: 1,
      process: 'washed', transactionType: 'spot', region: 'sidama',
      quantity: 500, unit: 'quintals', price: 18000, currency: 'ETB',
      description: 'Looking to purchase G1 washed Sidama or Yirgacheffe coffee. Must have ECX lot number and phytosanitary certificate. Prefer direct from cooperative or licensed exporter. Immediate payment.',
      createdAt: daysAgo(1),
    },
    {
      userId: u(2), type: 'buy', productCategory: 'green_coffee', grade: 2,
      process: 'natural', transactionType: 'spot', region: 'oromia',
      quantity: 300, unit: 'quintals', price: 16500, currency: 'ETB',
      description: 'European specialty importer looking for G2 natural Guji or Harrar. Cup score 84+. Needs origin traceability documentation. Willing to arrange sample cupping before purchase.',
      createdAt: daysAgo(3),
    },
    {
      userId: u(3), type: 'buy', productCategory: 'sesame', grade: 1,
      process: 'raw', transactionType: 'spot', region: 'tigray',
      quantity: 2000, unit: 'quintals', price: 8800, currency: 'ETB',
      description: 'Established trader buying Humera white sesame in large quantities. Must meet Chinese import standards (FFA < 1%, moisture < 7%). Multiple container orders welcomed.',
      createdAt: daysAgo(2),
    },
    {
      userId: u(4), type: 'buy', productCategory: 'frankincense',
      process: 'raw', transactionType: 'spot', region: 'tigray',
      quantity: 50, unit: 'quintals', price: 35000, currency: 'ETB',
      description: 'UAE-based fragrance company seeking Boswellia papyrifera Grade A+. Consistent supply contract preferred. Must pass GC-MS purity test. Can offer quarterly purchasing agreement.',
      createdAt: daysAgo(4),
    },
    {
      userId: u(5), type: 'buy', productCategory: 'white_teff', grade: 1,
      process: 'raw', transactionType: 'forward', region: 'amhara',
      quantity: 1000, unit: 'quintals', price: 8500, currency: 'ETB',
      description: 'Health food company purchasing white teff for European diaspora market. Need gluten-free certification and consistent supply year-round. Forward contract up to 1000 quintals/month.',
      createdAt: daysAgo(5),
    },
    {
      userId: u(0), type: 'buy', productCategory: 'chickpea', grade: 1,
      process: 'processed', transactionType: 'spot', region: 'oromia',
      quantity: 1500, unit: 'quintals', price: 5200, currency: 'ETB',
      description: 'Indian pulses importer looking for kabuli chickpea. 8mm screen size minimum. Moisture max 14%. Need SGS inspection report. Payment by irrevocable LC at sight.',
      createdAt: daysAgo(6),
    },
    {
      userId: u(1), type: 'buy', productCategory: 'hides_skins',
      process: 'raw', transactionType: 'spot', region: 'oromia',
      quantity: 5000, unit: 'pieces', price: 1100, currency: 'ETB',
      description: 'Chinese tannery purchasing wet-salted cattle hides. Grade A only. Prefer abattoir direct. Need official health and export certificates. Container load quantities. Negotiable price for recurring supply.',
      createdAt: daysAgo(7),
    },
    {
      userId: u(2), type: 'buy', productCategory: 'moringa',
      process: 'dried', transactionType: 'forward', region: 'snnpr',
      quantity: 100, unit: 'quintals', price: 20000, currency: 'ETB',
      description: 'Nutraceutical company sourcing organic moringa leaf powder. EU organic certification required. COA for heavy metals, microbiology, and pesticides needed. Ongoing quarterly orders.',
      createdAt: daysAgo(8),
    },
    {
      userId: u(3), type: 'buy', productCategory: 'honey',
      process: 'raw', transactionType: 'spot', region: 'amhara',
      quantity: 100, unit: 'quintals', price: 26000, currency: 'ETB',
      description: 'Premium honey buyer for Middle East market. Looking for raw forest honey, moisture <18%, antibiotic-free. Lab analysis required. Halal certification preferred.',
      createdAt: daysAgo(9),
    },
    {
      userId: u(4), type: 'buy', productCategory: 'niger_seed',
      process: 'raw', transactionType: 'spot', region: 'oromia',
      quantity: 800, unit: 'quintals', price: 7500, currency: 'ETB',
      description: 'Dutch oil mill purchasing Ethiopian niger seed (noug). Oil content >38% required. Low FFA. Phytosanitary certificate necessary. CIF Rotterdam terms preferred.',
      createdAt: daysAgo(10),
    },
    {
      userId: u(5), type: 'buy', productCategory: 'linseed',
      process: 'raw', transactionType: 'spot', region: 'amhara',
      quantity: 600, unit: 'quintals', price: 6200, currency: 'ETB',
      description: 'Looking for brown linseed for oil pressing. Oil content >36%. Clean sample, low weed seed. Canadian and Belgian buyers also accepted product. SGS weight cert needed.',
      createdAt: daysAgo(11),
    },
    {
      userId: u(0), type: 'buy', productCategory: 'korarima',
      process: 'dried', transactionType: 'spot', region: 'snnpr',
      quantity: 20, unit: 'quintals', price: 42000, currency: 'ETB',
      description: 'Spice trader buying korarima dried pods for Gulf market. Need uniform drying, no mould. Organic preferred. Willing to pay premium for verified organic supply chain.',
      createdAt: daysAgo(3),
    },
    {
      userId: u(1), type: 'buy', productCategory: 'fava_bean', grade: 1,
      process: 'processed', transactionType: 'spot', region: 'amhara',
      quantity: 800, unit: 'quintals', price: 4000, currency: 'ETB',
      description: 'Egyptian import company seeking large-seeded fava bean. 9mm screen. Low tannin content preferred. 50kg bags with fumigation. Payment within 5 days of loading.',
      createdAt: daysAgo(4),
    },
    {
      userId: u(2), type: 'buy', productCategory: 'soybean',
      process: 'raw', transactionType: 'forward', region: 'oromia',
      quantity: 2000, unit: 'quintals', price: 4800, currency: 'ETB',
      description: 'Feed mill in Addis Ababa seeking non-GMO soybean for forward contract. High protein required (>40%). Reliable supply partner needed for next 12 months. Preferred delivery to Modjo warehouse.',
      createdAt: daysAgo(5),
    },
    {
      userId: u(3), type: 'buy', productCategory: 'black_cumin',
      process: 'dried', transactionType: 'spot', region: 'amhara',
      quantity: 100, unit: 'quintals', price: 11500, currency: 'ETB',
      description: 'Saudi spice company looking for Ethiopian black cumin (nigella). High essential oil content. Sorted and cleaned. No dust or foreign material. Phytosanitary cert required.',
      createdAt: daysAgo(6),
    },
    {
      userId: u(4), type: 'buy', productCategory: 'lentils', grade: 1,
      process: 'processed', transactionType: 'spot', region: 'amhara',
      quantity: 700, unit: 'quintals', price: 6000, currency: 'ETB',
      description: 'Turkish importer seeking red lentils. Uniform size, bright colour. Protein >25%. Min 200 quintals per shipment. Can provide quality spec sheet. Offer LC payment terms.',
      createdAt: daysAgo(7),
    },
    {
      userId: u(5), type: 'buy', productCategory: 'ginger',
      process: 'dried', transactionType: 'spot', region: 'snnpr',
      quantity: 60, unit: 'quintals', price: 13500, currency: 'ETB',
      description: 'Indian spice processor looking for dried split ginger. Low fibre, high gingerol. Sulphur-free. Moisture <10%. Can purchase 3–4 times per year. Provide COA from accredited lab.',
      createdAt: daysAgo(8),
    },
    {
      userId: u(0), type: 'buy', productCategory: 'haricot_bean', grade: 1,
      process: 'processed', transactionType: 'spot', region: 'oromia',
      quantity: 1000, unit: 'quintals', price: 4400, currency: 'ETB',
      description: 'UK food company purchasing white pea beans (navy beans) for canned goods. Need uniform size, very low broken beans (<0.5%). FSSC 22000 supplier preferred. FOB Djibouti.',
      createdAt: daysAgo(9),
    },
    {
      userId: u(1), type: 'buy', productCategory: 'sunflower',
      process: 'raw', transactionType: 'spot', region: 'amhara',
      quantity: 500, unit: 'quintals', price: 5500, currency: 'ETB',
      description: 'Edible oil producer in Addis Ababa looking for sunflower seed. Oil content minimum 42%. Moisture <10%. Ongoing supply relationship preferred. Pickup at farm gate possible.',
      createdAt: daysAgo(10),
    },
    {
      userId: u(2), type: 'buy', productCategory: 'turmeric',
      process: 'processed', transactionType: 'spot', region: 'snnpr',
      quantity: 50, unit: 'quintals', price: 14000, currency: 'ETB',
      description: 'Herbal supplement company buying ground turmeric. Curcumin >3%. No added colour. Pesticide residue tested. EU-compliant packaging. Repeat buyer, looking for long-term partner.',
      createdAt: daysAgo(11),
    },
  ];
}

// ─── Insert ───────────────────────────────────────────────────────────────────

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Upsert demo users
    console.log('Inserting demo users...');
    for (const u of DEMO_USERS) {
      await client.query(
        `INSERT INTO users (id, name, phone, preferred_language, created_at)
         VALUES ($1, $2, $3, 'en', NOW())
         ON CONFLICT (phone) DO NOTHING`,
        [u.id, u.name, u.phone]
      );
    }

    // Re-fetch actual user IDs (in case of conflicts)
    const userRows = await client.query(
      `SELECT id FROM users WHERE phone = ANY($1) ORDER BY created_at LIMIT 6`,
      [DEMO_USERS.map(u => u.phone)]
    );
    const userIds = userRows.rows.map((r: any) => r.id);
    console.log(`Using ${userIds.length} users`);

    // 2. Build listing title from category + grade + process
    const buildTitle = (l: any) => {
      const parts: string[] = [];
      if (l.grade) parts.push(`G${l.grade}`);
      const processShort: Record<string, string> = {
        washed: 'Washed', natural: 'Natural', honey: 'Honey Process',
        raw: 'Raw', processed: 'Processed', dried: 'Dried',
        organic: 'Organic', fresh: 'Fresh',
      };
      if (l.process && l.process !== 'raw') parts.push(processShort[l.process] || l.process);
      const catName: Record<string, string> = {
        green_coffee: 'Coffee', sesame: 'Sesame', niger_seed: 'Niger Seed',
        chickpea: 'Chickpea', lentils: 'Lentils', haricot_bean: 'Haricot Bean',
        white_teff: 'White Teff', linseed: 'Linseed', soybean: 'Soybean',
        fava_bean: 'Fava Bean', mung_bean: 'Mung Bean', sunflower: 'Sunflower',
        groundnut: 'Groundnut', korarima: 'Korarima', black_cumin: 'Black Cumin',
        fenugreek: 'Fenugreek', ginger: 'Ginger', turmeric: 'Turmeric',
        honey: 'Honey', frankincense: 'Frankincense', hides_skins: 'Hides & Skins',
        moringa: 'Moringa',
      };
      parts.push(catName[l.productCategory] || l.productCategory);
      return parts.join(' ');
    };

    // 3. Insert listings
    console.log('Inserting listings...');
    const listingData = listings(userIds);
    let inserted = 0;
    for (const l of listingData) {
      const title = buildTitle(l);
      await client.query(
        `INSERT INTO listings
           (id, user_id, type, product_category, title, description,
            region, grade, process, transaction_type,
            quantity, unit, price, currency, images, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'active',$16,$16)`,
        [
          randomUUID(),
          l.userId,
          l.type,
          l.productCategory,
          title,
          l.description || null,
          l.region || null,
          l.grade || null,
          l.process || null,
          l.transactionType || null,
          l.quantity || null,
          l.unit || null,
          l.price || null,
          l.currency,
          JSON.stringify([]),
          l.createdAt,
        ]
      );
      inserted++;
      process.stdout.write(`\r  ${inserted}/${listingData.length} listings`);
    }

    await client.query('COMMIT');
    console.log(`\n✓ Done — ${inserted} listings seeded across ${userIds.length} demo traders`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n✗ Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
