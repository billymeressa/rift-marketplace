import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { depositVerifications } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const BANKS = [
  'CBE', 'Awash', 'Dashen', 'Abyssinia', 'Wegagen', 'United',
  'Nib', 'Zemen', 'Oromia', 'Bunna', 'Berhan', 'Abay',
  'Telebirr', 'M-Pesa', 'CBE Birr',
];

/** Generate a random amount between 0.01 and 0.99 ETB (2 decimal places) */
function randomMicroAmount(): string {
  const amount = Math.floor(Math.random() * 99 + 1) / 100; // 0.01 – 0.99
  return amount.toFixed(2);
}

const initiateSchema = z.object({
  accountHolder: z.string().min(1).max(200),
  accountNumber: z.string().min(4).max(50),
  bankName: z.string().min(1).max(100),
});

const confirmSchema = z.object({
  amount1: z.number().positive().max(1),
  amount2: z.number().positive().max(1),
});

// GET /deposit-verification/banks — list supported banks
router.get('/banks', (_req, res) => {
  res.json({ banks: BANKS });
});

// GET /deposit-verification/me — current deposit verification status
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [record] = await db
      .select()
      .from(depositVerifications)
      .where(eq(depositVerifications.userId, req.userId!))
      .orderBy(depositVerifications.createdAt)
      .limit(1);

    if (!record) {
      res.json({ status: 'none' });
      return;
    }

    // Check expiry
    if (record.status === 'pending' && new Date() > record.expiresAt) {
      await db
        .update(depositVerifications)
        .set({ status: 'expired' })
        .where(eq(depositVerifications.id, record.id));
      res.json({ status: 'expired', bankName: record.bankName, accountNumber: record.accountNumber });
      return;
    }

    res.json({
      id: record.id,
      status: record.status,
      bankName: record.bankName,
      accountNumber: record.accountNumber,
      accountHolder: record.accountHolder,
      attemptsLeft: record.attemptsLeft,
      expiresAt: record.expiresAt.toISOString(),
      verifiedAt: record.verifiedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Get deposit verification error:', error);
    res.status(500).json({ error: 'Failed to fetch deposit verification status' });
  }
});

// POST /deposit-verification — initiate micro-deposit verification
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = initiateSchema.parse(req.body);

    // Check for existing pending/verified record
    const [existing] = await db
      .select()
      .from(depositVerifications)
      .where(eq(depositVerifications.userId, req.userId!))
      .orderBy(depositVerifications.createdAt)
      .limit(1);

    if (existing?.status === 'verified') {
      res.status(409).json({ error: 'Account already verified' });
      return;
    }

    // Generate two distinct micro-amounts
    let amt1 = randomMicroAmount();
    let amt2 = randomMicroAmount();
    while (amt1 === amt2) {
      amt2 = randomMicroAmount();
    }

    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    let record;
    if (existing && (existing.status === 'pending' || existing.status === 'expired' || existing.status === 'failed')) {
      // Update existing record with new amounts and reset attempts
      [record] = await db
        .update(depositVerifications)
        .set({
          accountHolder: data.accountHolder,
          accountNumber: data.accountNumber,
          bankName: data.bankName,
          amount1: amt1,
          amount2: amt2,
          attemptsLeft: 3,
          status: 'pending',
          expiresAt,
          verifiedAt: null,
        })
        .where(eq(depositVerifications.id, existing.id))
        .returning();
    } else {
      [record] = await db
        .insert(depositVerifications)
        .values({
          userId: req.userId!,
          accountHolder: data.accountHolder,
          accountNumber: data.accountNumber,
          bankName: data.bankName,
          amount1: amt1,
          amount2: amt2,
          expiresAt,
        })
        .returning();
    }

    // In production, this is where you'd call a payment API (Chapa, Telebirr, etc.)
    // to actually send the two micro-deposits to the user's account.
    console.log(`[Deposit Verification] Sent ${amt1} ETB and ${amt2} ETB to ${data.bankName} account ${data.accountNumber}`);

    res.status(201).json({
      id: record.id,
      status: record.status,
      bankName: record.bankName,
      accountNumber: record.accountNumber,
      accountHolder: record.accountHolder,
      attemptsLeft: record.attemptsLeft,
      expiresAt: record.expiresAt.toISOString(),
      message: 'Two small deposits have been sent to your account. Enter the exact amounts to verify.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Initiate deposit verification error:', error);
    res.status(500).json({ error: 'Failed to initiate deposit verification' });
  }
});

// POST /deposit-verification/confirm — confirm the micro-deposit amounts
router.post('/confirm', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = confirmSchema.parse(req.body);

    const [record] = await db
      .select()
      .from(depositVerifications)
      .where(and(
        eq(depositVerifications.userId, req.userId!),
        eq(depositVerifications.status, 'pending'),
      ))
      .limit(1);

    if (!record) {
      res.status(404).json({ error: 'No pending deposit verification found' });
      return;
    }

    // Check expiry
    if (new Date() > record.expiresAt) {
      await db
        .update(depositVerifications)
        .set({ status: 'expired' })
        .where(eq(depositVerifications.id, record.id));
      res.status(410).json({ error: 'Verification expired. Please initiate a new one.' });
      return;
    }

    // Compare amounts (order-independent: user can enter them in any order)
    const expected = [parseFloat(record.amount1), parseFloat(record.amount2)].sort();
    const provided = [data.amount1, data.amount2].sort();
    const match = Math.abs(expected[0] - provided[0]) < 0.001 && Math.abs(expected[1] - provided[1]) < 0.001;

    if (match) {
      const [updated] = await db
        .update(depositVerifications)
        .set({ status: 'verified', verifiedAt: new Date() })
        .where(eq(depositVerifications.id, record.id))
        .returning();

      res.json({
        status: 'verified',
        message: 'Account verified successfully!',
        verifiedAt: updated.verifiedAt!.toISOString(),
      });
      return;
    }

    // Wrong amounts — decrement attempts
    const newAttempts = record.attemptsLeft - 1;
    if (newAttempts <= 0) {
      await db
        .update(depositVerifications)
        .set({ status: 'failed', attemptsLeft: 0 })
        .where(eq(depositVerifications.id, record.id));
      res.status(400).json({
        error: 'Too many failed attempts. Please initiate a new verification.',
        status: 'failed',
        attemptsLeft: 0,
      });
      return;
    }

    await db
      .update(depositVerifications)
      .set({ attemptsLeft: newAttempts })
      .where(eq(depositVerifications.id, record.id));

    res.status(400).json({
      error: 'Amounts do not match. Please check your account and try again.',
      attemptsLeft: newAttempts,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Confirm deposit verification error:', error);
    res.status(500).json({ error: 'Failed to confirm deposit verification' });
  }
});

export default router;
