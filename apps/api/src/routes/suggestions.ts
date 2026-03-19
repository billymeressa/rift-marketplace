import { Router } from 'express';
import { db } from '../db/client.js';
import { listings } from '../db/schema.js';
import { sql, ilike } from 'drizzle-orm';

const router = Router();

// Seed values — fallback when external APIs are unavailable or query is empty
const SEEDS: Record<string, string[]> = {
  product: [
    // Coffee
    'coffee', 'green_coffee', 'roasted_coffee', 'coffee_husk',
    // Grains & cereals
    'teff', 'white_teff', 'red_teff', 'wheat', 'bread_wheat', 'durum_wheat',
    'maize', 'sorghum', 'barley', 'millet', 'finger_millet', 'rice', 'oats',
    // Oilseeds
    'sesame', 'niger_seed', 'linseed', 'flaxseed', 'sunflower', 'rapeseed',
    'castor_seed', 'groundnut', 'soybean', 'safflower',
    // Pulses & legumes
    'chickpea', 'lentils', 'haricot_bean', 'fava_bean', 'field_pea',
    'mung_bean', 'kidney_bean', 'cowpea', 'pigeon_pea', 'lupine',
    // Spices
    'korarima', 'black_cumin', 'fenugreek', 'turmeric', 'ginger',
    'coriander', 'cardamom', 'long_pepper', 'cinnamon', 'clove',
    'chili_pepper', 'berbere', 'mitmita',
    // Vegetables
    'tomato', 'onion', 'potato', 'garlic', 'cabbage', 'carrot',
    'green_pepper', 'kale', 'lettuce', 'beetroot', 'sweet_potato',
    'enset', 'moringa', 'okra', 'eggplant', 'spinach', 'pumpkin',
    // Fruits
    'banana', 'mango', 'papaya', 'avocado', 'orange', 'lemon', 'lime',
    'guava', 'pineapple', 'watermelon', 'grape', 'apple', 'passion_fruit',
    'fig', 'date', 'sugarcane',
    // Cash crops
    'chat', 'khat', 'cotton', 'tobacco', 'tea', 'rubber', 'sisal',
    // Livestock
    'cattle', 'sheep', 'goat', 'camel', 'poultry', 'donkey', 'horse',
    'honey', 'beeswax', 'raw_milk', 'butter', 'cheese', 'eggs', 'hides_skins',
    // Flowers & herbs
    'rose', 'cut_flowers', 'herbs', 'gesho',
    // Equipment & services
    'fertilizer', 'pesticide', 'seeds', 'farm_tools', 'tractor',
    'irrigation_equipment', 'storage_bags', 'packaging',
    // Other
    'animal_feed', 'hay', 'straw', 'charcoal', 'firewood', 'incense',
    'frankincense', 'myrrh', 'gum_arabic', 'bamboo', 'eucalyptus',
  ],
  region: [
    'addis_ababa', 'oromia', 'amhara', 'snnpr', 'tigray', 'somali',
    'afar', 'benishangul', 'gambela', 'harari', 'dire_dawa',
    'sidama', 'south_west', 'central',
  ],
  condition: [
    'raw', 'processed', 'washed', 'natural', 'organic', 'fresh', 'dried',
  ],
  unit: [
    'kg', 'quintals', 'tons', 'bags', 'fcl', 'liters', 'pieces', 'head',
  ],
  transaction: [
    'spot', 'forward', 'vertical', 'horizontal',
  ],
};

// Map field name → DB column
const COLUMN_MAP: Record<string, any> = {
  product: listings.productCategory,
  region: listings.region,
  condition: listings.process,
  unit: listings.unit,
  transaction: listings.transactionType,
};

// ── External API helpers ────────────────────────────────────────────

/**
 * OpenStreetMap Nominatim — search for places in Ethiopia.
 * Free, no API key required. Rate limit: 1 req/s (we only call on user input).
 */
async function searchNominatim(q: string): Promise<{ value: string; label: string }[]> {
  if (!q || q.length < 2) return [];
  try {
    const params = new URLSearchParams({
      q,
      countrycodes: 'et',
      format: 'json',
      limit: '10',
      'accept-language': 'en',
      addressdetails: '1',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'RiftMarketplace/1.0' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as any[];

    const seen = new Set<string>();
    return data
      .map((place) => {
        const name = place.name || place.display_name.split(',')[0].trim();
        // Build a contextual label using address details
        const addr = place.address || {};
        const region = addr.state || addr.state_district || '';
        const label = region && region !== name ? `${name}, ${region}` : name;
        const value = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        return { value, label };
      })
      .filter((p) => {
        if (!p.value || seen.has(p.value)) return false;
        seen.add(p.value);
        return true;
      });
  } catch {
    return [];
  }
}


// ── Main endpoint ───────────────────────────────────────────────────

// GET /suggestions?field=product&q=cof
router.get('/', async (req, res) => {
  try {
    const field = req.query.field as string;
    const q = (req.query.q as string || '').toLowerCase().trim();

    if (!field || !SEEDS[field]) {
      res.status(400).json({ error: 'Invalid field. Use: product, region, condition, unit, transaction' });
      return;
    }

    const column = COLUMN_MAP[field];

    // 1. Get distinct values with usage counts from the DB
    let dbValues: { value: string; count: number }[] = [];
    if (column) {
      const conditions = [sql`${column} IS NOT NULL`, sql`${column} != ''`];
      if (q) {
        conditions.push(ilike(column, `%${q}%`));
      }
      const rows = await db
        .select({
          value: column,
          count: sql<number>`count(*)::int`,
        })
        .from(listings)
        .where(sql.join(conditions, sql` AND `))
        .groupBy(column)
        .orderBy(sql`count(*) DESC`)
        .limit(50);
      dbValues = rows.filter((r) => r.value) as { value: string; count: number }[];
    }

    // 2. Query external API for region (only when there's a search query)
    let apiResults: { value: string; label: string }[] = [];
    if (field === 'region' && q) {
      apiResults = await searchNominatim(q);
    }

    // 3. Merge: DB values first → API results (deduped) → seed fallbacks
    const dbSet = new Set(dbValues.map((r) => r.value));

    const apiMerged = apiResults
      .filter((a) => !dbSet.has(a.value))
      .map((a) => ({ value: a.value, count: 0, label: a.label }));

    const allSet = new Set([...dbSet, ...apiMerged.map((a) => a.value)]);

    const seeds = SEEDS[field]
      .filter((s) => !allSet.has(s))
      .filter((s) => !q || s.includes(q))
      .map((value) => ({ value, count: 0 }));

    const results = [...dbValues, ...apiMerged, ...seeds];

    res.json(results);
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

export default router;
