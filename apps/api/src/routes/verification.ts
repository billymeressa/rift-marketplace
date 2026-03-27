import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { sellerVerifications } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const submitVerificationSchema = z.object({
  businessName: z.string().min(1).max(200),
  businessType: z.enum(['exporter', 'cooperative', 'trader', 'farmer']),
  tradeLicenseRef: z.string().max(200).optional(),
  tradeLicenseUrl: z.string().url().optional(),
  exportLicenseUrl: z.string().url().optional(),
  ecxMembershipUrl: z.string().url().optional(),
});

// GET /verification/me - Get my verification status
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [verification] = await db
      .select()
      .from(sellerVerifications)
      .where(eq(sellerVerifications.userId, req.userId!))
      .limit(1);

    if (!verification) {
      res.json({ verificationStatus: 'unverified' });
      return;
    }

    res.json({
      ...verification,
      createdAt: verification.createdAt.toISOString(),
      updatedAt: verification.updatedAt.toISOString(),
      reviewedAt: verification.reviewedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('Get verification error:', error);
    res.status(500).json({ error: 'Failed to fetch verification status' });
  }
});

// POST /verification - Submit verification request (upsert)
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = submitVerificationSchema.parse(req.body);

    const [existing] = await db
      .select()
      .from(sellerVerifications)
      .where(eq(sellerVerifications.userId, req.userId!))
      .limit(1);

    let verification;
    if (existing) {
      [verification] = await db
        .update(sellerVerifications)
        .set({
          businessName: data.businessName,
          businessType: data.businessType,
          tradeLicenseRef: data.tradeLicenseRef,
          tradeLicenseUrl: data.tradeLicenseUrl,
          exportLicenseUrl: data.exportLicenseUrl,
          ecxMembershipUrl: data.ecxMembershipUrl,
          verificationStatus: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(sellerVerifications.userId, req.userId!))
        .returning();
    } else {
      [verification] = await db
        .insert(sellerVerifications)
        .values({
          userId: req.userId!,
          businessName: data.businessName,
          businessType: data.businessType,
          tradeLicenseRef: data.tradeLicenseRef,
          tradeLicenseUrl: data.tradeLicenseUrl,
          exportLicenseUrl: data.exportLicenseUrl,
          ecxMembershipUrl: data.ecxMembershipUrl,
          verificationStatus: 'pending',
        })
        .returning();
    }

    res.status(existing ? 200 : 201).json({
      ...verification,
      createdAt: verification.createdAt.toISOString(),
      updatedAt: verification.updatedAt.toISOString(),
      reviewedAt: verification.reviewedAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Submit verification error:', error);
    res.status(500).json({ error: 'Failed to submit verification' });
  }
});

// GET /verification/user/:id - Public verification status
router.get('/user/:id', async (req, res) => {
  try {
    const [verification] = await db
      .select({
        verificationStatus: sellerVerifications.verificationStatus,
        businessName: sellerVerifications.businessName,
        businessType: sellerVerifications.businessType,
      })
      .from(sellerVerifications)
      .where(eq(sellerVerifications.userId, req.params.id))
      .limit(1);

    res.json(verification ?? { verificationStatus: 'unverified' });
  } catch (error) {
    console.error('Get user verification error:', error);
    res.status(500).json({ error: 'Failed to fetch verification' });
  }
});

export default router;
