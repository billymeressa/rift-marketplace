import type { CoffeeGrade, CoffeeProcess, TransactionType, QuantityUnit } from '../types/listing';

export const GRADES: { value: CoffeeGrade; en: string; am: string }[] = [
  { value: 1, en: 'Grade 1', am: 'ደረጃ 1' },
  { value: 2, en: 'Grade 2', am: 'ደረጃ 2' },
  { value: 3, en: 'Grade 3', am: 'ደረጃ 3' },
  { value: 4, en: 'Grade 4', am: 'ደረጃ 4' },
  { value: 5, en: 'Grade 5', am: 'ደረጃ 5' },
];

export const PROCESSES: Record<CoffeeProcess, { en: string; am: string }> = {
  washed: { en: 'Washed', am: 'የታጠበ' },
  natural: { en: 'Natural', am: 'ተፈጥሯዊ' },
  unwashed: { en: 'Unwashed', am: 'ያልታጠበ' },
};

export const TRANSACTION_TYPES: Record<TransactionType, { en: string; am: string }> = {
  vertical: { en: 'Vertical', am: 'ትስስር' },
  horizontal: { en: 'Horizontal', am: 'አግድም' },
};

export const UNITS: Record<QuantityUnit, { en: string; am: string }> = {
  bags: { en: 'Bags/Kesha', am: 'ከረጢት/ኬሻ' },
  quintals: { en: 'Quintals', am: 'ኩንታል' },
  fcl: { en: 'Containers (FCL)', am: 'ኮንቴነር' },
  kg: { en: 'Kilograms', am: 'ኪሎግራም' },
  tons: { en: 'Tons', am: 'ቶን' },
};

export const PROCESS_OPTIONS = Object.entries(PROCESSES).map(([value, labels]) => ({
  value: value as CoffeeProcess,
  ...labels,
}));

export const TRANSACTION_TYPE_OPTIONS = Object.entries(TRANSACTION_TYPES).map(([value, labels]) => ({
  value: value as TransactionType,
  ...labels,
}));

export const UNIT_OPTIONS = Object.entries(UNITS).map(([value, labels]) => ({
  value: value as QuantityUnit,
  ...labels,
}));
