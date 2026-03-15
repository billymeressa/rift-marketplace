import type { ProductCategory } from '../types/listing';

export const PRODUCTS: Record<ProductCategory, { en: string; am: string }> = {
  coffee: { en: 'Coffee', am: 'ቡና' },
  sesame: { en: 'Sesame', am: 'ሰሊጥ' },
  mung_bean: { en: 'Mung Bean', am: 'ማሾ' },
  oilseed: { en: 'Oil Seeds', am: 'የቅባት እህሎች' },
  spice: { en: 'Spices', am: 'ቅመማ ቅመም' },
  equipment: { en: 'Equipment', am: 'መሣሪያዎች' },
  other: { en: 'Other', am: 'ሌላ' },
};

export const PRODUCT_OPTIONS = Object.entries(PRODUCTS).map(([value, labels]) => ({
  value: value as ProductCategory,
  ...labels,
}));
