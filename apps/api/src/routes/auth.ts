import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../db/client.js';
import {
  users, otpCodes, listings, orders, reviews,
  sellerVerifications, depositVerifications,
  conversations, messages, feedback,
} from '../db/schema.js';
import { eq, and, gt, isNull, or, inArray } from 'drizzle-orm';
import { getBotUsername, getTelegramDeepLink } from '../lib/telegram.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS_PER_HOUR = 5;

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-()]/g, '');
  // Ethiopian shorthand without country code: 09xxxxxxxx → +2519xxxxxxxx
  if (p.startsWith('0') && !p.startsWith('00') && !p.startsWith('+')) {
    p = '+251' + p.slice(1);
  }
  // Add leading + if missing
  else if (!p.startsWith('+')) {
    p = '+' + p;
  }
  return p;
}

function isValidInternationalPhone(phone: string): boolean {
  // E.164: + followed by 7–15 digits
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function makeToken(user: { id: string; phone?: string | null }, expiresIn = '30d') {
  return jwt.sign({ userId: user.id, phone: user.phone ?? null }, process.env.JWT_SECRET!, { expiresIn } as jwt.SignOptions);
}

function publicUser(user: any) {
  return {
    id: user.id,
    phone: user.phone ?? null,
    telegramId: user.telegramId ?? null,
    telegramUsername: user.telegramUsername ?? null,
    name: user.name,
    preferredLanguage: user.preferredLanguage,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
  };
}

// ─── POST /auth/send-code ───────────────────────────────────────────────────
// Unified endpoint for sign-in and sign-up.
// Generates an OTP, stores it with a session ID, returns a Telegram deep link.

router.post('/send-code', async (req, res) => {
  try {
    const { phone, name } = z.object({
      phone: z.string().min(1),
      name:  z.string().max(100).optional(),
    }).parse(req.body);

    const normalized = normalizePhone(phone);

    if (!isValidInternationalPhone(normalized)) {
      res.status(400).json({ error: 'Invalid phone number' });
      return;
    }

    // Rate limit: max 5 OTPs per hour per phone
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOtps = await db
      .select({ id: otpCodes.id })
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.phone, normalized),
          eq(otpCodes.purpose, 'auth'),
          gt(otpCodes.createdAt, oneHourAgo),
        )
      );

    if (recentOtps.length >= MAX_OTP_ATTEMPTS_PER_HOUR) {
      res.status(429).json({ error: 'too_many_attempts', message: 'Too many requests. Try again in an hour.' });
      return;
    }

    // Check if user exists
    const [existing] = await db.select().from(users).where(eq(users.phone, normalized)).limit(1);
    const isNewUser = !existing;

    // New user must provide a name
    if (isNewUser && (!name || !name.trim())) {
      res.status(400).json({ error: 'name_required', isNewUser: true });
      return;
    }

    // Generate OTP + unique session ID
    const code = generateOTP();
    const session = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await db.insert(otpCodes).values({
      phone: normalized,
      code,
      purpose: 'auth',
      session,
      expiresAt,
    });

    // Get Telegram bot deep link
    const botUsername = await getBotUsername();
    const telegramLink = botUsername
      ? getTelegramDeepLink(botUsername, session)
      : null;

    // Dev fallback: no bot token configured — surface the code directly so local
    // development works without a live Telegram bot.
    const isDev = !botUsername && process.env.NODE_ENV !== 'production';
    if (isDev) {
      console.log(`\n=============================`);
      console.log(`OTP for ${normalized}: ${code}`);
      console.log(`Session: ${session}`);
      console.log(`=============================\n`);
    }

    res.json({
      isNewUser,
      telegramLink,
      session,
      // Only included in non-production when no bot is configured
      devCode: isDev ? code : undefined,
      message: isDev
        ? 'Dev mode: no Telegram bot configured. Use the code shown in the app.'
        : 'Open Telegram to receive your verification code.',
    });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    console.error('Send code error:', err);
    res.status(500).json({ error: 'Failed to send code' });
  }
});

// ─── POST /auth/verify-code ─────────────────────────────────────────────────
// Verifies the OTP. If user is new, creates the account. Returns JWT.

router.post('/verify-code', async (req, res) => {
  try {
    const { phone, code, name } = z.object({
      phone: z.string().min(1),
      code:  z.string().length(6),
      name:  z.string().max(100).optional(),
    }).parse(req.body);

    const normalized = normalizePhone(phone);
    const now = new Date();

    // Find valid, unused OTP for this phone
    const [otp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.phone, normalized),
          eq(otpCodes.code, code),
          eq(otpCodes.purpose, 'auth'),
          gt(otpCodes.expiresAt, now),
          isNull(otpCodes.usedAt),
        )
      )
      .orderBy(otpCodes.createdAt)
      .limit(1);

    if (!otp) {
      res.status(400).json({ error: 'invalid_or_expired_code' });
      return;
    }

    // Mark OTP as used
    await db.update(otpCodes).set({ usedAt: now }).where(eq(otpCodes.id, otp.id));

    // Find or create user
    let [user] = await db.select().from(users).where(eq(users.phone, normalized)).limit(1);

    if (!user) {
      // Create new user
      [user] = await db.insert(users).values({
        phone: normalized,
        name: (name || '').trim(),
      }).returning();
    }

    res.json({ token: makeToken(user), user: publicUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    console.error('Verify code error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ─── POST /auth/telegram-mini-app ───────────────────────────────────────────
// Authenticates a Telegram Mini App user via initData HMAC-SHA256 verification.
// On success: finds or creates a user by telegramId, returns JWT.

router.post('/telegram-mini-app', async (req, res) => {
  try {
    const { initData } = z.object({ initData: z.string().min(1) }).parse(req.body);

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      res.status(503).json({ error: 'Telegram bot not configured' });
      return;
    }

    // ── 1. Parse the URL-encoded initData string ─────────────────────────────
    const params = new URLSearchParams(initData);
    const receivedHash = params.get('hash');
    if (!receivedHash) {
      res.status(400).json({ error: 'Missing hash in initData' });
      return;
    }

    // ── 2. Build the data-check string (all fields except hash, sorted) ───────
    const entries: string[] = [];
    for (const [key, value] of params.entries()) {
      if (key !== 'hash') entries.push(`${key}=${value}`);
    }
    entries.sort();
    const dataCheckString = entries.join('\n');

    // ── 3. Verify HMAC-SHA256 ─────────────────────────────────────────────────
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (expectedHash !== receivedHash) {
      res.status(401).json({ error: 'initData verification failed' });
      return;
    }

    // ── 4. Check auth_date is fresh (within 1 hour) ───────────────────────────
    const authDate = Number(params.get('auth_date') || 0);
    if (Date.now() / 1000 - authDate > 3600) {
      res.status(401).json({ error: 'initData has expired' });
      return;
    }

    // ── 5. Extract Telegram user ──────────────────────────────────────────────
    const tgUserRaw = params.get('user');
    if (!tgUserRaw) {
      res.status(400).json({ error: 'No user field in initData' });
      return;
    }
    const tgUser = JSON.parse(tgUserRaw) as {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };

    const telegramId = String(tgUser.id);
    const derivedName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'User';

    // ── 6. Find or create user by telegramId ──────────────────────────────────
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, telegramId))
      .limit(1);

    if (!user) {
      // New user — create with Telegram info, no phone
      [user] = await db.insert(users).values({
        telegramId,
        name: derivedName,
        telegramUsername: tgUser.username ?? null,
        preferredLanguage: tgUser.language_code?.startsWith('am') ? 'am'
          : tgUser.language_code?.startsWith('om') ? 'om' : 'en',
      }).returning();
    } else if (!user.telegramUsername && tgUser.username) {
      // Update username if it changed
      [user] = await db
        .update(users)
        .set({ telegramUsername: tgUser.username })
        .where(eq(users.id, user.id))
        .returning();
    }

    res.json({ token: makeToken(user), user: publicUser(user) });
  } catch (err: any) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    console.error('Telegram Mini App auth error:', err);
    // Surface DB/internal errors in detail so we can diagnose (will be removed after fix)
    const cause = (err as any)?.cause?.message ?? (err as any)?.cause ?? '';
    res.status(500).json({ error: `${err?.message ?? 'Authentication failed'} | cause: ${cause}` });
  }
});

// ─── DELETE /auth/account ────────────────────────────────────────────────────
// Permanently deletes the authenticated user and all their data.

router.delete('/account', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    // Fetch user to get phone (needed to purge OTP codes, may be null for TMA-only users)
    const [user] = await db.select({ phone: users.phone })
      .from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Delete in FK-safe order:

    // 1. Messages in conversations the user is part of
    const userConversations = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(or(eq(conversations.buyerId, userId), eq(conversations.sellerId, userId)));

    if (userConversations.length > 0) {
      const convIds = userConversations.map((c) => c.id);
      await db.delete(messages).where(inArray(messages.conversationId, convIds));
      await db.delete(conversations).where(inArray(conversations.id, convIds));
    }

    // 2. Reviews written by or about the user
    await db.delete(reviews).where(
      or(eq(reviews.reviewerId, userId), eq(reviews.revieweeId, userId))
    );

    // 3. Orders as buyer or seller
    await db.delete(orders).where(
      or(eq(orders.buyerId, userId), eq(orders.sellerId, userId))
    );

    // 4. Listings
    await db.delete(listings).where(eq(listings.userId, userId));

    // 5. Ancillary records
    await db.delete(depositVerifications).where(eq(depositVerifications.userId, userId));
    await db.delete(sellerVerifications).where(eq(sellerVerifications.userId, userId));
    await db.delete(feedback).where(eq(feedback.userId, userId));
    if (user.phone) {
      await db.delete(otpCodes).where(eq(otpCodes.phone, user.phone));
    }

    // 6. Finally, the user row itself
    await db.delete(users).where(eq(users.id, userId));

    res.json({ message: 'Account permanently deleted' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
