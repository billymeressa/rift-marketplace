import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users, otpCodes } from '../db/schema.js';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { getBotUsername, getTelegramDeepLink } from '../lib/telegram.js';

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

function makeToken(user: { id: string; phone: string }, expiresIn = '30d') {
  return jwt.sign({ userId: user.id, phone: user.phone }, process.env.JWT_SECRET!, { expiresIn } as jwt.SignOptions);
}

function publicUser(user: any) {
  return {
    id: user.id,
    phone: user.phone,
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

    // Dev fallback: log OTP to console
    if (!botUsername) {
      console.log(`\n=============================`);
      console.log(`OTP for ${normalized}: ${code}`);
      console.log(`Session: ${session}`);
      console.log(`=============================\n`);
    }

    res.json({
      isNewUser,
      telegramLink,
      session,
      message: 'Open Telegram to receive your verification code.',
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

export default router;
