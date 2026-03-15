import { pgTable, uuid, varchar, text, smallint, decimal, boolean, timestamp, serial } from 'drizzle-orm/pg-core';

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
