export type ListingType = 'buy' | 'sell';

export type ProductCategory =
  | 'coffee'
  | 'sesame'
  | 'mung_bean'
  | 'oilseed'
  | 'spice'
  | 'equipment'
  | 'other';

export type CoffeeRegion =
  | 'yirgacheffe'
  | 'sidama'
  | 'guji'
  | 'jimma'
  | 'nekemte'
  | 'limu'
  | 'kafa'
  | 'teppi'
  | 'illubabur'
  | 'bale'
  | 'harar'
  | 'bench_maji'
  | 'west_arsi'
  | 'other';

export type CoffeeGrade = 1 | 2 | 3 | 4 | 5;

export type CoffeeProcess = 'washed' | 'natural' | 'unwashed';

export type TransactionType = 'vertical' | 'horizontal';

export type QuantityUnit = 'bags' | 'quintals' | 'fcl' | 'kg' | 'tons';

export type Currency = 'ETB' | 'USD';

export type ListingStatus = 'active' | 'closed';

export interface Listing {
  id: string;
  userId: string;
  type: ListingType;
  productCategory: ProductCategory;
  title: string;
  description?: string;
  region?: CoffeeRegion;
  grade?: CoffeeGrade;
  process?: CoffeeProcess;
  transactionType?: TransactionType;
  quantity?: number;
  unit?: QuantityUnit;
  price?: number;
  currency: Currency;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  user?: ListingUser;
}

export interface ListingUser {
  id: string;
  name: string;
  phone: string;
  telegramUsername?: string;
}

export interface ListingFilters {
  type?: ListingType;
  productCategory?: ProductCategory;
  region?: CoffeeRegion;
  grade?: CoffeeGrade;
  process?: CoffeeProcess;
  transactionType?: TransactionType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateListingInput {
  type: ListingType;
  productCategory: ProductCategory;
  title: string;
  description?: string;
  region?: CoffeeRegion;
  grade?: CoffeeGrade;
  process?: CoffeeProcess;
  transactionType?: TransactionType;
  quantity?: number;
  unit?: QuantityUnit;
  price?: number;
  currency?: Currency;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
