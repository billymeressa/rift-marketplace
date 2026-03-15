import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { normalizePhone, isValidEthiopianPhone, createOtp, verifyOtp } from '../services/otp.js';

const router = Router();

const sendOtpSchema = z.object({
  phone: z.string().min(1),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(1),
  code: z.string().length(6),
});

router.post('/otp/send', async (req, res) => {
  try {
    const { phone } = sendOtpSchema.parse(req.body);
    const normalized = normalizePhone(phone);

    if (!isValidEthiopianPhone(normalized)) {
      res.status(400).json({ error: 'Invalid Ethiopian phone number' });
      return;
    }

    await createOtp(normalized);
    res.json({ message: 'OTP sent', phone: normalized });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

router.post('/otp/verify', async (req, res) => {
  try {
    const { phone, code } = verifyOtpSchema.parse(req.body);
    const normalized = normalizePhone(phone);

    const valid = await verifyOtp(normalized, code);
    if (!valid) {
      res.status(400).json({ error: 'Invalid or expired code' });
      return;
    }

    // Upsert user
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, normalized))
      .limit(1);

    if (!user) {
      [user] = await db
        .insert(users)
        .values({ phone: normalized })
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
        telegramUsername: user.telegramUsername,
        preferredLanguage: user.preferredLanguage,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;
