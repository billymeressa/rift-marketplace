import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users, otpCodes } from '../db/schema.js';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { generateOTP, sendOTP } from '../lib/otp.js';

const router = Router();
const SALT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS_PER_HOUR = 5;

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  let p = phone.replace(/\s+/g, '');
  if (p.startsWith('0'))                          p = '+251' + p.slice(1);
  else if (p.startsWith('251') && !p.startsWith('+')) p = '+' + p;
  return p;
}

function isValidEthiopianPhone(phone: string): boolean {
  return /^\+251[79]\d{8}$/.test(phone);
}

function makeToken(user: { id: string; phone: string }, expiresIn = '30d') {
  return jwt.sign({ userId: user.id, phone: user.phone }, process.env.JWT_SECRET!, { expiresIn });
}

function makeResetToken(phone: string) {
  return jwt.sign({ phone, purpose: 'password_reset' }, process.env.JWT_SECRET!, { expiresIn: '15m' });
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

// ─── Schemas ─────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  phone:    z.string().min(1),
  name:     z.string().min(1, 'Name is required').max(100),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  phone:    z.string().min(1),
  password: z.string().min(1, 'Password is required'),
});

// ─── POST /auth/register ─────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  try {
    const { phone, name, password } = registerSchema.parse(req.body);
    const normalized = normalizePhone(phone);

    if (!isValidEthiopianPhone(normalized)) {
      res.status(400).json({ error: 'Invalid Ethiopian phone number' });
      return;
    }

    const [existing] = await db.select().from(users).where(eq(users.phone, normalized)).limit(1);
    if (existing) {
      res.status(409).json({ error: 'phone_taken' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [user] = await db.insert(users).values({ phone: normalized, name, passwordHash }).returning();

    res.status(201).json({ token: makeToken(user), user: publicUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── POST /auth/login ────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  try {
    const { phone, password } = loginSchema.parse(req.body);
    const normalized = normalizePhone(phone);

    if (!isValidEthiopianPhone(normalized)) {
      res.status(400).json({ error: 'Invalid Ethiopian phone number' });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.phone, normalized)).limit(1);
    if (!user) {
      // Constant-time response to prevent phone enumeration
      await bcrypt.hash('dummy', 1);
      res.status(401).json({ error: 'invalid_credentials' });
      return;
    }

    // Legacy users without password: allow login once, flag to set password
    if (!user.passwordHash) {
      res.json({ token: makeToken(user), user: publicUser(user), mustSetPassword: true });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'invalid_credentials' });
      return;
    }

    res.json({ token: makeToken(user), user: publicUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── POST /auth/forgot-password ─────────────────────────────────────────────
// Rate-limited: max 5 OTPs per hour per phone

router.post('/forgot-password', async (req, res) => {
  try {
    const { phone } = z.object({ phone: z.string().min(1) }).parse(req.body);
    const normalized = normalizePhone(phone);

    if (!isValidEthiopianPhone(normalized)) {
      res.status(400).json({ error: 'Invalid Ethiopian phone number' });
      return;
    }

    // Check user exists — but respond generically to prevent enumeration
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.phone, normalized)).limit(1);

    // Rate limit: count OTPs in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOtps = await db
      .select({ id: otpCodes.id })
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.phone, normalized),
          eq(otpCodes.purpose, 'password_reset'),
          gt(otpCodes.createdAt, oneHourAgo),
        )
      );

    if (recentOtps.length >= MAX_OTP_ATTEMPTS_PER_HOUR) {
      res.status(429).json({ error: 'too_many_attempts', message: 'Too many requests. Try again in an hour.' });
      return;
    }

    if (user) {
      const code = generateOTP();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      await db.insert(otpCodes).values({
        phone: normalized,
        code,
        purpose: 'password_reset',
        expiresAt,
      });

      await sendOTP(normalized, code);
    }

    // Always return 200 — don't reveal if the phone is registered
    res.json({ message: 'If this number is registered, you will receive a code.' });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to send code' });
  }
});

// ─── POST /auth/verify-otp ───────────────────────────────────────────────────

router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, code } = z.object({
      phone: z.string().min(1),
      code:  z.string().length(6),
    }).parse(req.body);

    const normalized = normalizePhone(phone);
    const now = new Date();

    const [otp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.phone, normalized),
          eq(otpCodes.code, code),
          eq(otpCodes.purpose, 'password_reset'),
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

    // Issue a short-lived reset token (15 min)
    const resetToken = makeResetToken(normalized);
    res.json({ resetToken });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ─── POST /auth/reset-password ───────────────────────────────────────────────

router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, password } = z.object({
      resetToken: z.string().min(1),
      password:   z.string().min(6, 'Password must be at least 6 characters'),
    }).parse(req.body);

    // Verify reset token
    let payload: any;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_SECRET!);
    } catch {
      res.status(400).json({ error: 'Reset link expired. Please request a new code.' });
      return;
    }

    if (payload.purpose !== 'password_reset') {
      res.status(400).json({ error: 'Invalid reset token' });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.phone, payload.phone)).limit(1);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [updated] = await db.update(users).set({ passwordHash }).where(eq(users.id, user.id)).returning();

    res.json({ token: makeToken(updated), user: publicUser(updated) });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// ─── POST /auth/set-password ─────────────────────────────────────────────────
// For existing users who never had a password (legacy accounts)

router.post('/set-password', async (req, res) => {
  try {
    const { phone, password } = z.object({
      phone:    z.string().min(1),
      password: z.string().min(6),
    }).parse(req.body);

    const normalized = normalizePhone(phone);
    const [user] = await db.select().from(users).where(eq(users.phone, normalized)).limit(1);

    if (!user || user.passwordHash) {
      // Don't reveal if account exists; if they already have a password, use forgot-password
      res.status(400).json({ error: 'Invalid request' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [updated] = await db.update(users).set({ passwordHash }).where(eq(users.id, user.id)).returning();

    res.json({ token: makeToken(updated), user: publicUser(updated) });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    console.error('Set password error:', err);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

export default router;
