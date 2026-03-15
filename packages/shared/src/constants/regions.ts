import type { CoffeeRegion } from '../types/listing';

export const REGIONS: Record<CoffeeRegion, { en: string; am: string }> = {
  yirgacheffe: { en: 'Yirgacheffe', am: 'ይርጋጨፌ' },
  sidama: { en: 'Sidama', am: 'ሲዳማ' },
  guji: { en: 'Guji', am: 'ጉጂ' },
  jimma: { en: 'Jimma', am: 'ጅማ' },
  nekemte: { en: 'Nekemte', am: 'ነቀምት' },
  limu: { en: 'Limu', am: 'ሊሙ' },
  kafa: { en: 'Kafa', am: 'ካፋ' },
  teppi: { en: 'Teppi', am: 'ቴፒ' },
  illubabur: { en: 'Illubabur', am: 'ኢሉባቡር' },
  bale: { en: 'Bale', am: 'ባሌ' },
  harar: { en: 'Harar', am: 'ሀረር' },
  bench_maji: { en: 'Bench Maji', am: 'ቤንች ማጂ' },
  west_arsi: { en: 'West Arsi', am: 'ምዕራብ አርሲ' },
  other: { en: 'Other', am: 'ሌላ' },
};

export const REGION_OPTIONS = Object.entries(REGIONS).map(([value, labels]) => ({
  value: value as CoffeeRegion,
  ...labels,
}));
