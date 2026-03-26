// Central options — single source of truth for all selectors across the app

export type LangOption = { value: string; en: string; am: string; om: string };

export const PRODUCT_OPTIONS: LangOption[] = [
  // Coffee
  { value: 'coffee',         en: 'Coffee',              am: 'ቡና',            om: 'Buna' },
  { value: 'green_coffee',   en: 'Green Coffee',        am: 'አረንጓዴ ቡና',     om: 'Buna Magariisa' },
  { value: 'roasted_coffee', en: 'Roasted Coffee',      am: 'የተቆላ ቡና',      om: 'Buna Waadame' },
  // Grains & cereals
  { value: 'teff',           en: 'Teff',                am: 'ጤፍ',            om: 'Xaafii' },
  { value: 'white_teff',     en: 'White Teff',          am: 'ነጭ ጤፍ',        om: 'Xaafii Adii' },
  { value: 'red_teff',       en: 'Red Teff',            am: 'ቀይ ጤፍ',        om: 'Xaafii Diimaa' },
  { value: 'wheat',          en: 'Wheat',               am: 'ስንዴ',           om: 'Qamadii' },
  { value: 'maize',          en: 'Maize / Corn',        am: 'በቆሎ',           om: 'Boqqolloo' },
  { value: 'sorghum',        en: 'Sorghum',             am: 'ማሽላ',           om: 'Mishingaa' },
  { value: 'barley',         en: 'Barley',              am: 'ገብስ',           om: 'Garbuu' },
  { value: 'millet',         en: 'Millet',              am: 'ዳጉሳ',           om: 'Daagujjaa' },
  { value: 'rice',           en: 'Rice',                am: 'ሩዝ',            om: 'Ruuzii' },
  // Oilseeds
  { value: 'sesame',         en: 'Sesame',              am: 'ሰሊጥ',           om: 'Saliixaa' },
  { value: 'niger_seed',     en: 'Niger Seed',          am: 'ኑግ',            om: 'Nuugii' },
  { value: 'linseed',        en: 'Linseed / Flax',      am: 'ተልባ',           om: 'Talbaa' },
  { value: 'sunflower',      en: 'Sunflower',           am: 'ሱፍ',            om: 'Suufii' },
  { value: 'groundnut',      en: 'Groundnut / Peanut',  am: 'ለውዝ',           om: 'Leeyyoo' },
  { value: 'soybean',        en: 'Soybean',             am: 'አኩሪ አተር',      om: 'Soyii' },
  // Pulses & legumes
  { value: 'chickpea',       en: 'Chickpea',            am: 'ሽምብራ',          om: 'Shumbura' },
  { value: 'lentils',        en: 'Lentils',             am: 'ምስር',           om: 'Misira' },
  { value: 'haricot_bean',   en: 'Haricot Bean',        am: 'ቦሎቄ',           om: 'Bolooqee' },
  { value: 'fava_bean',      en: 'Fava Bean',           am: 'ባቄላ',           om: 'Baaqelaa' },
  { value: 'field_pea',      en: 'Field Pea',           am: 'አተር',           om: 'Atara' },
  { value: 'mung_bean',      en: 'Mung Bean',           am: 'ማሾ',            om: 'Maashoo' },
  { value: 'kidney_bean',    en: 'Kidney Bean',         am: 'ቀይ ቦሎቄ',       om: 'Bolooqee Diimaa' },
  // Spices
  { value: 'korarima',       en: 'Korarima',            am: 'ኮረሪማ',          om: 'Korarimaa' },
  { value: 'black_cumin',    en: 'Black Cumin',         am: 'ጥቁር አዝሙድ',     om: 'Azmudii Gurraacha' },
  { value: 'fenugreek',      en: 'Fenugreek',           am: 'አብሽ',           om: 'Sunqoo' },
  { value: 'turmeric',       en: 'Turmeric',            am: 'እርድ',           om: 'Irdii' },
  { value: 'ginger',         en: 'Ginger',              am: 'ዝንጅብል',         om: 'Jinjibila' },
  { value: 'berbere',        en: 'Berbere',             am: 'በርበሬ',          om: 'Barbaree' },
  { value: 'mitmita',        en: 'Mitmita',             am: 'ሚጥሚጣ',          om: 'Mitmixaa' },
  { value: 'chili_pepper',   en: 'Chili Pepper',        am: 'ቃሪያ',           om: 'Mixmixaa' },
  // Vegetables
  { value: 'tomato',         en: 'Tomato',              am: 'ቲማቲም',          om: 'Timaatima' },
  { value: 'onion',          en: 'Onion',               am: 'ሽንኩርት',         om: 'Shunkurtii' },
  { value: 'potato',         en: 'Potato',              am: 'ድንች',           om: 'Dinnicha' },
  { value: 'garlic',         en: 'Garlic',              am: 'ነጭ ሽንኩርት',     om: 'Qullubbii Adii' },
  { value: 'cabbage',        en: 'Cabbage',             am: 'ጎመን',           om: 'Raafuu' },
  { value: 'carrot',         en: 'Carrot',              am: 'ካሮት',           om: 'Kaarotii' },
  { value: 'sweet_potato',   en: 'Sweet Potato',        am: 'ስኳር ድንች',      om: 'Mixaaxissaa' },
  { value: 'enset',          en: 'Enset / False Banana', am: 'እንሰት',         om: 'Warqee' },
  { value: 'moringa',        en: 'Moringa',             am: 'ሞሪንጋ',          om: 'Moringaa' },
  // Fruits
  { value: 'banana',         en: 'Banana',              am: 'ሙዝ',            om: 'Muuzii' },
  { value: 'mango',          en: 'Mango',               am: 'ማንጎ',           om: 'Maangoo' },
  { value: 'avocado',        en: 'Avocado',             am: 'አቮካዶ',          om: 'Avokaadoo' },
  { value: 'papaya',         en: 'Papaya',              am: 'ፓፓያ',           om: 'Paappayyaa' },
  { value: 'orange',         en: 'Orange',              am: 'ብርቱካን',         om: 'Burtukaana' },
  { value: 'sugarcane',      en: 'Sugarcane',           am: 'ሸንኮራ አገዳ',     om: 'Shankoraa' },
  // Cash crops
  { value: 'chat',           en: 'Chat / Khat',         am: 'ጫት',            om: 'Jimaa' },
  { value: 'cotton',         en: 'Cotton',              am: 'ጥጥ',            om: 'Jirbii' },
  { value: 'tea',            en: 'Tea',                 am: 'ሻይ',            om: 'Shaayii' },
  // Livestock & animal products
  { value: 'cattle',         en: 'Cattle',              am: 'ከብት',           om: 'Loon' },
  { value: 'sheep',          en: 'Sheep',               am: 'በግ',            om: 'Hoolaa' },
  { value: 'goat',           en: 'Goat',                am: 'ፍየል',           om: 'Re\'ee' },
  { value: 'poultry',        en: 'Poultry',             am: 'ዶሮ',            om: 'Lukkuu' },
  { value: 'honey',          en: 'Honey',               am: 'ማር',            om: 'Damma' },
  { value: 'raw_milk',       en: 'Raw Milk',            am: 'ጥሬ ወተት',       om: 'Aannan Dheedhii' },
  { value: 'butter',         en: 'Butter',              am: 'ቅቤ',            om: 'Dhadhaa' },
  { value: 'eggs',           en: 'Eggs',                am: 'እንቁላል',         om: 'Hanqaaquu' },
  { value: 'hides_skins',    en: 'Hides & Skins',       am: 'ቆዳ',            om: 'Gogaa' },
  // Other
  { value: 'frankincense',   en: 'Frankincense',        am: 'እጣን',           om: 'Ixaana' },
  { value: 'honey_wine',     en: 'Honey Wine (Tej)',    am: 'ጠጅ',            om: 'Daadhi' },
  { value: 'fertilizer',     en: 'Fertilizer',          am: 'ማዳበሪያ',         om: 'Xaa\'oo' },
  { value: 'seeds',          en: 'Seeds',               am: 'ዘር',            om: 'Sanyii' },
  { value: 'farm_tools',     en: 'Farm Tools',          am: 'የእርሻ መሣሪያ',    om: 'Meeshaa Qonnaa' },
  { value: 'animal_feed',    en: 'Animal Feed',         am: 'የእንስሳ መኖ',     om: 'Nyaata Horii' },
];

// Ethiopian administrative regions
export const REGION_OPTIONS: LangOption[] = [
  { value: 'addis_ababa',      en: 'Addis Ababa',          am: 'አዲስ አበባ',          om: 'Finfinnee' },
  { value: 'oromia',           en: 'Oromia',               am: 'ኦሮሚያ',             om: 'Oromiyaa' },
  { value: 'amhara',           en: 'Amhara',               am: 'አማራ',              om: 'Amaaraa' },
  { value: 'snnpr',            en: 'South Ethiopia',       am: 'ደቡብ ኢትዮጵያ',       om: 'Itoophiyaa Kibbaa' },
  { value: 'tigray',           en: 'Tigray',               am: 'ትግራይ',             om: 'Tigraay' },
  { value: 'somali',           en: 'Somali',               am: 'ሶማሌ',              om: 'Sumaalee' },
  { value: 'afar',             en: 'Afar',                 am: 'አፋር',              om: 'Afaar' },
  { value: 'benishangul',      en: 'Benishangul-Gumuz',    am: 'ቤኒሻንጉል-ጉሙዝ',      om: 'Beenishaangul-Gumuz' },
  { value: 'gambela',          en: 'Gambela',              am: 'ጋምቤላ',             om: 'Gambeellaa' },
  { value: 'harari',           en: 'Harari',               am: 'ሐረሪ',              om: 'Hararii' },
  { value: 'dire_dawa',        en: 'Dire Dawa',            am: 'ድሬ ዳዋ',            om: 'Dirree Dhawaa' },
  { value: 'sidama',           en: 'Sidama',               am: 'ሲዳማ',              om: 'Sidaamaa' },
  { value: 'south_west',       en: 'South West Ethiopia',  am: 'ደቡብ ምዕራብ ኢትዮጵያ',  om: 'Itoophiyaa Kibba Lixaa' },
  { value: 'central',          en: 'Central Ethiopia',     am: 'መካከለኛ ኢትዮጵያ',     om: 'Itoophiyaa Giddugaleessaa' },
];

// Generalised condition — applies to any product
export const CONDITION_OPTIONS: LangOption[] = [
  { value: 'raw',       en: 'Raw / Unprocessed', am: 'ጥሬ',         om: 'Dheedhii' },
  { value: 'processed', en: 'Processed',         am: 'ሂደት ያለፈ',    om: 'Kan qophaa\'e' },
  { value: 'washed',    en: 'Washed',            am: 'የታጠበ',       om: 'Dhiqamaa' },
  { value: 'natural',   en: 'Natural / Sun-dried',am: 'ተፈጥሯዊ',     om: 'Uumamaa' },
  { value: 'organic',   en: 'Organic',           am: 'ኦርጋኒክ',      om: 'Orgaanikii' },
  { value: 'fresh',     en: 'Fresh',             am: 'ትኩስ',        om: 'Qulqulluu' },
  { value: 'dried',     en: 'Dried',             am: 'የደረቀ',       om: 'Gogaa' },
];

export const GRADE_OPTIONS: LangOption[] = [1, 2, 3, 4, 5].map((g) => ({
  value: String(g),
  en: `Grade ${g}`,
  am: `ደረጃ ${g}`,
  om: `Sadarkaa ${g}`,
}));

export const TRANSACTION_OPTIONS: LangOption[] = [
  { value: 'spot',     en: 'Spot / Cash',     am: 'ወዲያው ክፍያ',    om: 'Kafaltii Hatattamaa' },
  { value: 'forward',  en: 'Forward Contract', am: 'ቀድሞ ውል',      om: 'Waliigaltee Dursaa' },
  { value: 'vertical', en: 'Vertical',         am: 'ቀጥታ ትስስር',    om: 'Ol-gadee' },
  { value: 'horizontal',en: 'Horizontal',      am: 'አግድም',        om: 'Dalgee' },
];

export const UNIT_OPTIONS: LangOption[] = [
  { value: 'kg',        en: 'Kg',         am: 'ኪ.ግ',      om: 'Kg' },
  { value: 'quintals',  en: 'Quintals',   am: 'ኩንታል',     om: 'Kuuntaalii' },
  { value: 'tons',      en: 'Tons',       am: 'ቶን',       om: 'Toonii' },
  { value: 'bags',      en: 'Bags',       am: 'ከረጢት',     om: 'Korojoo' },
  { value: 'fcl',       en: 'Container',  am: 'ኮንቴነር',    om: 'Konteeneraa' },
  { value: 'liters',    en: 'Litres',     am: 'ሊትር',      om: 'Liitira' },
  { value: 'pieces',    en: 'Pieces',     am: 'ቁጥር',      om: 'Lakkoofsa' },
  { value: 'head',      en: 'Head',       am: 'ራስ',       om: 'Mataa' },
];

export const CURRENCY_OPTIONS: LangOption[] = [
  { value: 'ETB', en: 'ETB (Birr)', am: 'ብር (ETB)', om: 'Birrii (ETB)' },
  { value: 'USD', en: 'USD',        am: 'ዶላር (USD)', om: 'Doolara (USD)' },
];

// Helper — build a quick label map from any option list
export function buildLabelMap(options: LangOption[]): Record<string, { en: string; am: string; om: string }> {
  return Object.fromEntries(options.map(({ value, en, am, om }) => [value, { en, am, om }]));
}

export const PRODUCT_LABELS  = buildLabelMap(PRODUCT_OPTIONS);
export const REGION_LABELS   = buildLabelMap(REGION_OPTIONS);
export const CONDITION_LABELS = buildLabelMap(CONDITION_OPTIONS);

// ─── Listing title builder ────────────────────────────────────────────────────
// Produces a descriptive, human-readable title from the structured listing fields.
// Formula: [G{n}] [{Condition}] [{Product}][ — {Region}]
// Examples:
//   G1 Washed Coffee — Sidama
//   Organic Sesame — Tigray
//   Natural Honey — Amhara
//   Cattle — Oromia

// Short English labels for conditions that have long display strings
const CONDITION_SHORT_EN: Record<string, string> = {
  natural:   'Natural',
  honey:     'Honey',
  raw:       'Raw',
  processed: 'Processed',
  washed:    'Washed',
  organic:   'Organic',
  fresh:     'Fresh',
  dried:     'Dried',
};

export function buildListingTitle(
  listing: {
    productCategory?: string | null;
    grade?: number | null;
    process?: string | null;
    region?: string | null;
  },
  lang: 'en' | 'am' | 'om' = 'en',
  opts: { includeRegion?: boolean } = {},
): string {
  const { includeRegion = false } = opts;
  const category = listing.productCategory ?? '';
  const product  = PRODUCT_LABELS[category]?.[lang] ?? category;
  const profile  = getProductProfile(category);
  const parts: string[] = [];

  // Grade prefix — only for product types that support grading
  if (profile.showGrade && listing.grade) {
    parts.push(`G${listing.grade}`);
  }

  // Condition/process — 'raw' is the silent default, skip it
  if (listing.process && listing.process !== 'raw' && profile.conditions.length > 0) {
    const condOpt = profile.conditions.find(c => c.value === listing.process);
    if (condOpt) {
      const label = lang === 'en'
        ? (CONDITION_SHORT_EN[listing.process] ?? condOpt.en)
        : condOpt[lang];
      parts.push(label);
    }
  }

  parts.push(product);

  let title = parts.join(' ');

  if (includeRegion && listing.region) {
    const regionLabel = REGION_LABELS[listing.region]?.[lang];
    if (regionLabel) title += ` — ${regionLabel}`;
  }

  return title || product;
}

// Normalize user input to a consistent key: lowercase, spaces → underscores, trim
export function normalizeValue(input: string): string {
  return input.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
}

// Pretty-print a normalized key for display: coffee_beans → Coffee Beans
export function prettifyValue(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Product groups ──────────────────────────────────────────────────────────

export const COFFEE_PRODUCTS   = new Set(['coffee', 'green_coffee', 'roasted_coffee']);
export const GRAIN_PRODUCTS    = new Set(['teff', 'white_teff', 'red_teff', 'wheat', 'maize', 'sorghum', 'barley', 'millet', 'rice']);
export const OILSEED_PRODUCTS  = new Set(['sesame', 'niger_seed', 'linseed', 'sunflower', 'groundnut', 'soybean']);
export const PULSE_PRODUCTS    = new Set(['chickpea', 'lentils', 'haricot_bean', 'fava_bean', 'field_pea', 'mung_bean', 'kidney_bean']);
export const SPICE_PRODUCTS    = new Set(['korarima', 'black_cumin', 'fenugreek', 'turmeric', 'ginger', 'berbere', 'mitmita', 'chili_pepper']);
export const VEG_PRODUCTS      = new Set(['tomato', 'onion', 'potato', 'garlic', 'cabbage', 'carrot', 'sweet_potato', 'enset', 'moringa']);
export const FRUIT_PRODUCTS    = new Set(['banana', 'mango', 'avocado', 'papaya', 'orange', 'sugarcane']);
export const LIVESTOCK_PRODUCTS= new Set(['cattle', 'sheep', 'goat', 'poultry']);
export const ANIMAL_PRODUCTS   = new Set(['honey', 'raw_milk', 'butter', 'eggs', 'hides_skins']);
export const CASH_CROPS        = new Set(['chat', 'cotton', 'tea']);

// Products that support grade (for backwards compat)
export const GRADED_PRODUCTS = new Set([
  ...COFFEE_PRODUCTS, 'sesame', 'teff', 'white_teff', 'red_teff', 'wheat', 'maize', 'sorghum',
  'mung_bean', 'chickpea', 'haricot_bean', 'lentils', 'niger_seed', 'sunflower',
]);

// Products that DON'T typically have a processing condition (for backwards compat)
export const NO_CONDITION_PRODUCTS = new Set([...LIVESTOCK_PRODUCTS]);

// ─── Condition subsets per product type ──────────────────────────────────────

export const CONDITIONS_COFFEE: LangOption[] = [
  { value: 'washed',    en: 'Washed',             am: 'የታጠበ',      om: 'Dhiqamaa' },
  { value: 'natural',   en: 'Natural / Sun-dried', am: 'ተፈጥሯዊ',     om: 'Uumamaa' },
  { value: 'honey',     en: 'Honey Process',       am: 'ማር ሂደት',    om: 'Hannaga Damma' },
  { value: 'organic',   en: 'Organic',             am: 'ኦርጋኒክ',     om: 'Orgaanikii' },
];

export const CONDITIONS_BULK: LangOption[] = [
  { value: 'raw',       en: 'Raw / Unprocessed',   am: 'ጥሬ',         om: 'Dheedhii' },
  { value: 'processed', en: 'Processed / Cleaned', am: 'ሂደት ያለፈ',   om: 'Kan qophaa\'e' },
  { value: 'organic',   en: 'Organic',             am: 'ኦርጋኒክ',     om: 'Orgaanikii' },
];

export const CONDITIONS_FRESH: LangOption[] = [
  { value: 'fresh',     en: 'Fresh',               am: 'ትኩስ',        om: 'Qulqulluu' },
  { value: 'dried',     en: 'Dried',               am: 'የደረቀ',       om: 'Gogaa' },
  { value: 'organic',   en: 'Organic',             am: 'ኦርጋኒክ',     om: 'Orgaanikii' },
];

export const CONDITIONS_SPICE: LangOption[] = [
  { value: 'raw',       en: 'Raw / Whole',         am: 'ጥሬ',         om: 'Dheedhii' },
  { value: 'dried',     en: 'Dried',               am: 'የደረቀ',       om: 'Gogaa' },
  { value: 'processed', en: 'Ground / Blended',    am: 'ሂደት ያለፈ',   om: 'Kan qophaa\'e' },
  { value: 'organic',   en: 'Organic',             am: 'ኦርጋኒክ',     om: 'Orgaanikii' },
];

export const CONDITIONS_ANIMAL: LangOption[] = [
  { value: 'raw',       en: 'Raw',                 am: 'ጥሬ',         om: 'Dheedhii' },
  { value: 'processed', en: 'Processed',           am: 'ሂደት ያለፈ',   om: 'Kan qophaa\'e' },
  { value: 'organic',   en: 'Organic',             am: 'ኦርጋኒክ',     om: 'Orgaanikii' },
];

// ─── Product profile ──────────────────────────────────────────────────────────

export type ProductProfile = {
  showGrade:       boolean;
  conditions:      LangOption[]; // empty = hide condition field
  defaultUnit:     string;
  units:           LangOption[];
  showTransaction: boolean;
  conditionLabel:  string;       // label for the condition selector
};

export function getProductProfile(category: string): ProductProfile {
  const bulkUnits   = UNIT_OPTIONS.filter(u => ['kg','quintals','tons','bags','fcl'].includes(u.value));
  const smallUnits  = UNIT_OPTIONS.filter(u => ['kg','bags','pieces'].includes(u.value));
  const liquidUnits = UNIT_OPTIONS.filter(u => ['liters','kg','pieces'].includes(u.value));
  const livestockU  = UNIT_OPTIONS.filter(u => u.value === 'head');

  if (COFFEE_PRODUCTS.has(category))
    return { showGrade: true,  conditions: CONDITIONS_COFFEE,  defaultUnit: 'kg',       units: bulkUnits,   showTransaction: true,  conditionLabel: 'Process' };
  if (GRAIN_PRODUCTS.has(category))
    return { showGrade: GRADED_PRODUCTS.has(category), conditions: CONDITIONS_BULK, defaultUnit: 'quintals', units: bulkUnits, showTransaction: true, conditionLabel: 'Condition' };
  if (OILSEED_PRODUCTS.has(category))
    return { showGrade: GRADED_PRODUCTS.has(category), conditions: CONDITIONS_BULK, defaultUnit: 'quintals', units: bulkUnits, showTransaction: true, conditionLabel: 'Condition' };
  if (PULSE_PRODUCTS.has(category))
    return { showGrade: GRADED_PRODUCTS.has(category), conditions: CONDITIONS_BULK, defaultUnit: 'quintals', units: bulkUnits, showTransaction: true, conditionLabel: 'Condition' };
  if (SPICE_PRODUCTS.has(category))
    return { showGrade: false, conditions: CONDITIONS_SPICE,  defaultUnit: 'kg',       units: smallUnits,  showTransaction: true,  conditionLabel: 'Form' };
  if (VEG_PRODUCTS.has(category) || FRUIT_PRODUCTS.has(category))
    return { showGrade: false, conditions: CONDITIONS_FRESH,  defaultUnit: 'kg',       units: bulkUnits,   showTransaction: true,  conditionLabel: 'Condition' };
  if (LIVESTOCK_PRODUCTS.has(category))
    return { showGrade: false, conditions: [],                defaultUnit: 'head',     units: livestockU,  showTransaction: false, conditionLabel: '' };
  if (ANIMAL_PRODUCTS.has(category))
    return { showGrade: false, conditions: CONDITIONS_ANIMAL, defaultUnit: 'kg',       units: liquidUnits, showTransaction: true,  conditionLabel: 'Condition' };
  if (CASH_CROPS.has(category))
    return { showGrade: false, conditions: CONDITIONS_BULK,   defaultUnit: 'quintals', units: bulkUnits,   showTransaction: true,  conditionLabel: 'Condition' };

  // Default
  return { showGrade: false, conditions: CONDITIONS_BULK, defaultUnit: 'kg', units: UNIT_OPTIONS, showTransaction: true, conditionLabel: 'Condition' };
}
