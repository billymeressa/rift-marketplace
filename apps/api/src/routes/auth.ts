import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();
const SALT_ROUNDS = 12;

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\s+/g, '');
  if (normalized.startsWith('0')) {
    normalized = '+251' + normalized.slice(1);
  } else if (normalized.startsWith('251') && !normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  return normalized;
}

function isValidEthiopianPhone(phone: string): boolean {
  return /^\+251[79]\d{8}$/.test(phone);
}

function makeToken(user: { id: string; phone: string }) {
  return jwt.sign(
    { userId: user.id, phone: user.phone },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  );
}

function publicUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    preferredLanguage: user.preferredLanguage,
    createdAt: user.createdAt.toISOString(),
  };
}

const registerSchema = z.object({
  phone: z.string().min(1),
  name: z.string().min(1, 'Name is required').max(100),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1, 'Password is required'),
});

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { phone, name, password } = registerSchema.parse(req.body);
    const normalized = normalizePhone(phone);

    if (!isValidEthiopianPhone(normalized)) {
      res.status(400).json({ error: 'Invalid Ethiopian phone number' });
      return;
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.phone, normalized))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: 'phone_taken' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [user] = await db
      .insert(users)
      .values({ phone: normalized, name, passwordHash })
      .returning();

    res.status(201).json({ token: makeToken(user), user: publicUser(user) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = loginSchema.parse(req.body);
    const normalized = normalizePhone(phone);

    if (!isValidEthiopianPhone(normalized)) {
      res.status(400).json({ error: 'Invalid Ethiopian phone number' });
      return;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, normalized))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: 'invalid_credentials' });
      return;
    }

    // Existing users with no password hash: allow login, prompt to set password
    if (!user.passwordHash) {
      const token = makeToken(user);
      res.json({ token, user: publicUser(user), mustSetPassword: true });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'invalid_credentials' });
      return;
    }

    res.json({ token: makeToken(user), user: publicUser(user) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/set-password — for existing users who never had a password
router.post('/set-password', async (req, res) => {
  try {
    const { phone, password } = z.object({
      phone: z.string().min(1),
      password: z.string().min(6),
    }).parse(req.body);

    const normalized = normalizePhone(phone);
    const [user] = await db.select().from(users).where(eq(users.phone, normalized)).limit(1);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [updated] = await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, user.id))
      .returning();

    res.json({ token: makeToken(updated), user: publicUser(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Set password error:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

export default router;
