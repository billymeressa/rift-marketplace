import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

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

const registerSchema = z.object({
  phone: z.string().min(1),
  name: z.string().min(1, 'Name is required').max(100),
});

// POST /auth/register — create or return existing user, no verification required
router.post('/register', async (req, res) => {
  try {
    const { phone, name } = registerSchema.parse(req.body);
    const normalized = normalizePhone(phone);

    if (!isValidEthiopianPhone(normalized)) {
      res.status(400).json({ error: 'Invalid Ethiopian phone number' });
      return;
    }

    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, normalized))
      .limit(1);

    if (!user) {
      [user] = await db
        .insert(users)
        .values({ phone: normalized, name })
        .returning();
    } else if (name && user.name !== name) {
      [user] = await db
        .update(users)
        .set({ name })
        .where(eq(users.id, user.id))
        .returning();
    }

    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        preferredLanguage: user.preferredLanguage,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

export default router;
