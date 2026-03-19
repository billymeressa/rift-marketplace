import { pgTable, uuid, varchar, text, smallint, decimal, boolean, timestamp, serial, jsonb, unique } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: varchar('phone', { length: 15 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull().default(''),
  telegramUsername: varchar('telegram_username', { length: 50 }),
  preferredLanguage: varchar('preferred_language', { length: 2 }).notNull().default('am'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const otpCodes = pgTable('otp_codes', {
  id: serial('id').primaryKey(),
  phone: varchar('phone', { length: 15 }).notNull(),
  code: varchar('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  type: varchar('type', { length: 4 }).notNull(), // 'buy' | 'sell'
  productCategory: varchar('product_category', { length: 20 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  region: varchar('region', { length: 30 }),
  grade: smallint('grade'),
  process: varchar('process', { length: 10 }),
  transactionType: varchar('transaction_type', { length: 12 }),
  quantity: decimal('quantity'),
  unit: varchar('unit', { length: 15 }),
  price: decimal('price'),
  currency: varchar('currency', { length: 3 }).notNull().default('ETB'),
  status: varchar('status', { length: 10 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').notNull().references(() => listings.id),
  buyerId: uuid('buyer_id').notNull().references(() => users.id),
  sellerId: uuid('seller_id').notNull().references(() => users.id),
  quantity: decimal('quantity').notNull(),
  unit: varchar('unit', { length: 15 }).notNull(),
  pricePerUnit: decimal('price_per_unit').notNull(),
  totalPrice: decimal('total_price').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('ETB'),
  deliveryTerms: text('delivery_terms'),
  status: varchar('status', { length: 20 }).notNull().default('proposed'),
  escrowStatus: varchar('escrow_status', { length: 20 }).notNull().default('none'),
  statusHistory: jsonb('status_history').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sellerVerifications = pgTable('seller_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id).unique(),
  businessName: varchar('business_name', { length: 200 }),
  businessType: varchar('business_type', { length: 50 }),
  tradeLicenseRef: varchar('trade_license_ref', { length: 200 }),
  verificationStatus: varchar('verification_status', { length: 20 }).notNull().default('unverified'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewNote: text('review_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  reviewerId: uuid('reviewer_id').notNull().references(() => users.id),
  revieweeId: uuid('reviewee_id').notNull().references(() => users.id),
  rating: smallint('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('unique_review_per_order').on(table.orderId, table.reviewerId),
]);

export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  type: varchar('type', { length: 20 }).notNull().default('general'),
  message: text('message'),
  nps: smallint('nps'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
