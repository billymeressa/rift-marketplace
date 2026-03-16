// Central options — single source of truth for all selectors across the app

export type LangOption = { value: string; en: string; am: string };

export const PRODUCT_OPTIONS: LangOption[] = [
  { value: 'coffee',       en: 'Coffee',        am: 'ቡና' },
  { value: 'sesame',       en: 'Sesame',         am: 'ሰሊጥ' },
  { value: 'teff',         en: 'Teff',           am: 'ጤፍ' },
  { value: 'wheat',        en: 'Wheat',          am: 'ስንዴ' },
  { value: 'maize',        en: 'Maize / Corn',   am: 'በቆሎ' },
  { value: 'sorghum',      en: 'Sorghum',        am: 'ማሽላ' },
  { value: 'mung_bean',    en: 'Mung Bean',      am: 'ማሾ' },
  { value: 'chickpea',     en: 'Chickpea',       am: 'ሽምብራ' },
  { value: 'haricot_bean', en: 'Haricot Bean',   am: 'ቦሎቄ' },
  { value: 'lentils',      en: 'Lentils',        am: 'ምስር' },
  { value: 'oilseed',      en: 'Oil Seeds',      am: 'የቅባት እህሎች' },
  { value: 'niger_seed',   en: 'Niger Seed',     am: 'ኑግ' },
  { value: 'sunflower',    en: 'Sunflower',      am: 'ሱፍ' },
  { value: 'spice',        en: 'Spices',         am: 'ቅመማ ቅመም' },
  { value: 'vegetables',   en: 'Vegetables',     am: 'አትክልት' },
  { value: 'fruits',       en: 'Fruits',         am: 'ፍራፍሬ' },
  { value: 'livestock',    en: 'Livestock',      am: 'እንስሳ' },
  { value: 'dairy',        en: 'Dairy',          am: 'የወተት ምርቶች' },
  { value: 'equipment',    en: 'Equipment',      am: 'መሣሪያዎች' },
  { value: 'other',        en: 'Other',          am: 'ሌላ' },
];

// Ethiopian administrative regions
export const REGION_OPTIONS: LangOption[] = [
  { value: 'addis_ababa',      en: 'Addis Ababa',          am: 'አዲስ አበባ' },
  { value: 'oromia',           en: 'Oromia',               am: 'ኦሮሚያ' },
  { value: 'amhara',           en: 'Amhara',               am: 'አማራ' },
  { value: 'snnpr',            en: 'South Ethiopia',       am: 'ደቡብ ኢትዮጵያ' },
  { value: 'tigray',           en: 'Tigray',               am: 'ትግራይ' },
  { value: 'somali',           en: 'Somali',               am: 'ሶማሌ' },
  { value: 'afar',             en: 'Afar',                 am: 'አፋር' },
  { value: 'benishangul',      en: 'Benishangul-Gumuz',    am: 'ቤኒሻንጉል-ጉሙዝ' },
  { value: 'gambela',          en: 'Gambela',              am: 'ጋምቤላ' },
  { value: 'harari',           en: 'Harari',               am: 'ሐረሪ' },
  { value: 'dire_dawa',        en: 'Dire Dawa',            am: 'ድሬ ዳዋ' },
  { value: 'sidama',           en: 'Sidama',               am: 'ሲዳማ' },
  { value: 'south_west',       en: 'South West Ethiopia',  am: 'ደቡብ ምዕራብ ኢትዮጵያ' },
  { value: 'central',          en: 'Central Ethiopia',     am: 'መካከለኛ ኢትዮጵያ' },
];

// Generalised condition — applies to any product
export const CONDITION_OPTIONS: LangOption[] = [
  { value: 'raw',       en: 'Raw / Unprocessed', am: 'ጥሬ' },
  { value: 'processed', en: 'Processed',         am: 'ሂደት ያለፈ' },
  { value: 'washed',    en: 'Washed',            am: 'የታጠበ' },
  { value: 'natural',   en: 'Natural / Sun-dried',am: 'ተፈጥሯዊ' },
  { value: 'organic',   en: 'Organic',           am: 'ኦርጋኒክ' },
  { value: 'fresh',     en: 'Fresh',             am: 'ትኩስ' },
  { value: 'dried',     en: 'Dried',             am: 'የደረቀ' },
];

export const GRADE_OPTIONS: LangOption[] = [1, 2, 3, 4, 5].map((g) => ({
  value: String(g),
  en: `Grade ${g}`,
  am: `ደረጃ ${g}`,
}));

export const TRANSACTION_OPTIONS: LangOption[] = [
  { value: 'spot',     en: 'Spot / Cash',     am: 'ወዲያው ክፍያ' },
  { value: 'forward',  en: 'Forward Contract', am: 'ቀድሞ ውል' },
  { value: 'vertical', en: 'Vertical',         am: 'ቀጥታ ትስስር' },
  { value: 'horizontal',en: 'Horizontal',      am: 'አግድም' },
];

export const UNIT_OPTIONS: LangOption[] = [
  { value: 'kg',        en: 'Kg',         am: 'ኪ.ግ' },
  { value: 'quintals',  en: 'Quintals',   am: 'ኩንታል' },
  { value: 'tons',      en: 'Tons',       am: 'ቶን' },
  { value: 'bags',      en: 'Bags',       am: 'ከረጢት' },
  { value: 'fcl',       en: 'Container',  am: 'ኮንቴነር' },
  { value: 'liters',    en: 'Litres',     am: 'ሊትር' },
  { value: 'pieces',    en: 'Pieces',     am: 'ቁጥር' },
  { value: 'head',      en: 'Head',       am: 'ራስ' },
];

export const CURRENCY_OPTIONS: LangOption[] = [
  { value: 'ETB', en: 'ETB (Birr)', am: 'ብር (ETB)' },
  { value: 'USD', en: 'USD',        am: 'ዶላር (USD)' },
];

// Helper — build a quick label map from any option list
export function buildLabelMap(options: LangOption[]): Record<string, { en: string; am: string }> {
  return Object.fromEntries(options.map(({ value, en, am }) => [value, { en, am }]));
}

export const PRODUCT_LABELS  = buildLabelMap(PRODUCT_OPTIONS);
export const REGION_LABELS   = buildLabelMap(REGION_OPTIONS);
export const CONDITION_LABELS = buildLabelMap(CONDITION_OPTIONS);

// Products that support grade
export const GRADED_PRODUCTS = new Set([
  'coffee', 'sesame', 'teff', 'wheat', 'maize', 'sorghum',
  'mung_bean', 'chickpea', 'haricot_bean', 'lentils',
  'oilseed', 'niger_seed', 'sunflower',
]);

// Products that DON'T typically have a processing condition
export const NO_CONDITION_PRODUCTS = new Set(['equipment', 'livestock', 'other']);
