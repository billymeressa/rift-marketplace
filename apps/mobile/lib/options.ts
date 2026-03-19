// Central options — single source of truth for all selectors across the app

export type LangOption = { value: string; en: string; am: string; om: string };

export const PRODUCT_OPTIONS: LangOption[] = [
  { value: 'coffee',       en: 'Coffee',        am: 'ቡና',          om: 'Buna' },
  { value: 'sesame',       en: 'Sesame',         am: 'ሰሊጥ',        om: 'Saliixaa' },
  { value: 'teff',         en: 'Teff',           am: 'ጤፍ',         om: 'Xaafii' },
  { value: 'wheat',        en: 'Wheat',          am: 'ስንዴ',        om: 'Qamadii' },
  { value: 'maize',        en: 'Maize / Corn',   am: 'በቆሎ',        om: 'Boqqolloo' },
  { value: 'sorghum',      en: 'Sorghum',        am: 'ማሽላ',        om: 'Mishingaa' },
  { value: 'mung_bean',    en: 'Mung Bean',      am: 'ማሾ',         om: 'Maashoo' },
  { value: 'chickpea',     en: 'Chickpea',       am: 'ሽምብራ',       om: 'Shumbura' },
  { value: 'haricot_bean', en: 'Haricot Bean',   am: 'ቦሎቄ',        om: 'Bolooqee' },
  { value: 'lentils',      en: 'Lentils',        am: 'ምስር',        om: 'Misira' },
  { value: 'oilseed',      en: 'Oil Seeds',      am: 'የቅባት እህሎች',  om: 'Midhaan Zayitaa' },
  { value: 'niger_seed',   en: 'Niger Seed',     am: 'ኑግ',         om: 'Nuugii' },
  { value: 'sunflower',    en: 'Sunflower',      am: 'ሱፍ',         om: 'Suufii' },
  { value: 'spice',        en: 'Spices',         am: 'ቅመማ ቅመም',    om: 'Mi\'eessituu' },
  { value: 'vegetables',   en: 'Vegetables',     am: 'አትክልት',      om: 'Kuduraa' },
  { value: 'fruits',       en: 'Fruits',         am: 'ፍራፍሬ',       om: 'Fuduraa' },
  { value: 'livestock',    en: 'Livestock',      am: 'እንስሳ',       om: 'Horii' },
  { value: 'dairy',        en: 'Dairy',          am: 'የወተት ምርቶች',   om: 'Bu\'aa Aananii' },
  { value: 'equipment',    en: 'Equipment',      am: 'መሣሪያዎች',     om: 'Meeshaalee' },
  { value: 'other',        en: 'Other',          am: 'ሌላ',         om: 'Kan biraa' },
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

// Products that support grade
export const GRADED_PRODUCTS = new Set([
  'coffee', 'sesame', 'teff', 'wheat', 'maize', 'sorghum',
  'mung_bean', 'chickpea', 'haricot_bean', 'lentils',
  'oilseed', 'niger_seed', 'sunflower',
]);

// Products that DON'T typically have a processing condition
export const NO_CONDITION_PRODUCTS = new Set(['equipment', 'livestock', 'other']);
