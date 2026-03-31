import { pgTable, uuid, varchar, text, smallint, decimal, timestamp, jsonb, unique } from 'drizzle-orm/pg-core';

export const otpCodes = pgTable('otp_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: varchar('phone', { length: 20 }).notNull(),
  code: varchar('code', { length: 6 }).notNull(),
  purpose: varchar('purpose', { length: 20 }).notNull(), // 'auth'
  session: varchar('session', { length: 50 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: varchar('phone', { length: 20 }).unique(),                // nullable — TMA users may have no phone
  telegramId: varchar('telegram_id', { length: 30 }).unique(),     // Telegram user ID (TMA auth)
  name: varchar('name', { length: 100 }).notNull().default(''),
  telegramUsername: varchar('telegram_username', { length: 50 }),
  preferredLanguage: varchar('preferred_language', { length: 2 }).notNull().default('am'),
  role: varchar('role', { length: 20 }).notNull().default('user'), // 'user' | 'admin' | 'inspector'
  passwordHash: text('password_hash'),
  pushToken: text('push_token'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});


export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  type: varchar('type', { length: 4 }).notNull(), // 'buy' | 'sell'
  productCategory: varchar('product_category', { length: 50 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  region: varchar('region', { length: 50 }),
  grade: smallint('grade'),
  process: varchar('process', { length: 30 }),
  transactionType: varchar('transaction_type', { length: 12 }),
  quantity: decimal('quantity'),
  unit: varchar('unit', { length: 15 }),
  price: decimal('price'),
  currency: varchar('currency', { length: 3 }).notNull().default('ETB'),
  images: jsonb('images').notNull().default([]),
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
  paymentTxRef: varchar('payment_tx_ref', { length: 100 }),
  platformFeeAmount: decimal('platform_fee_amount'),
  statusHistory: jsonb('status_history').notNull().default([]),
  inspectorId: uuid('inspector_id').references(() => users.id),
  inspectionStatus: varchar('inspection_status', { length: 20 }),        // pending | passed | failed | skipped
  inspectionNotes: text('inspection_notes'),
  inspectionPhotos: jsonb('inspection_photos').notNull().default([]),
  inspectionCompletedAt: timestamp('inspection_completed_at', { withTimezone: true }),
  truckInfo: jsonb('truck_info'),                                          // {driverName, phone, plateNumber, waybillRef}
  assignedTruckId: uuid('assigned_truck_id').references(() => trucks.id),
  assignedDriverId: uuid('assigned_driver_id').references(() => drivers.id),
  sealNumber: varchar('seal_number', { length: 50 }),
  sealPhotos: jsonb('seal_photos').notNull().default([]),
  pickupConfirmedAt: timestamp('pickup_confirmed_at', { withTimezone: true }),
  pickupPhotos: jsonb('pickup_photos').notNull().default([]),
  sealIntact: varchar('seal_intact', { length: 10 }), // 'yes' | 'no' | null
  escrowAutoReleaseAt: timestamp('escrow_auto_release_at', { withTimezone: true }),
  deliveryPhotos: jsonb('delivery_photos').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const trucks = pgTable('trucks', {
  id: uuid('id').primaryKey().defaultRandom(),
  plateNumber: varchar('plate_number', { length: 20 }).notNull().unique(),
  make: varchar('make', { length: 50 }),
  model: varchar('model', { length: 50 }),
  capacityKg: decimal('capacity_kg'),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active | inactive
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const drivers = pgTable('drivers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  licenseNumber: varchar('license_number', { length: 50 }),
  truckId: uuid('truck_id').references(() => trucks.id),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active | inactive | suspended
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  txRef: varchar('tx_ref', { length: 100 }).notNull().unique(),
  chapaRef: varchar('chapa_ref', { length: 100 }),
  stripeSessionId: varchar('stripe_session_id', { length: 200 }),
  amount: decimal('amount').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('ETB'),
  platformFee: decimal('platform_fee').notNull(),
  gateway: varchar('gateway', { length: 20 }).notNull().default('chapa'), // chapa | stripe
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | success | failed
  chapaResponse: jsonb('chapa_response'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sellerVerifications = pgTable('seller_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id).unique(),
  businessName: varchar('business_name', { length: 200 }),
  businessType: varchar('business_type', { length: 50 }),
  tradeLicenseRef: varchar('trade_license_ref', { length: 200 }),
  // Document photo URLs (uploaded to Cloudinary)
  tradeLicenseUrl: text('trade_license_url'),
  exportLicenseUrl: text('export_license_url'),
  ecxMembershipUrl: text('ecx_membership_url'),
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

export const depositVerifications = pgTable('deposit_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  accountHolder: varchar('account_holder', { length: 200 }).notNull(),
  accountNumber: varchar('account_number', { length: 50 }).notNull(),
  bankName: varchar('bank_name', { length: 100 }).notNull(),
  amount1: decimal('amount_1').notNull(), // small random amount e.g. 0.12
  amount2: decimal('amount_2').notNull(), // small random amount e.g. 0.34
  attemptsLeft: smallint('attempts_left').notNull().default(3),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | verified | failed | expired
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  buyerId: uuid('buyer_id').notNull().references(() => users.id),
  sellerId: uuid('seller_id').notNull().references(() => users.id),
  listingId: uuid('listing_id').notNull().references(() => listings.id),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('unique_conversation').on(table.buyerId, table.sellerId, table.listingId),
]);

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id),
  senderId: uuid('sender_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  type: varchar('type', { length: 10 }).notNull().default('text'), // text | image
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});


export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  type: varchar('type', { length: 20 }).notNull().default('general'),
  message: text('message'),
  nps: smallint('nps'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
