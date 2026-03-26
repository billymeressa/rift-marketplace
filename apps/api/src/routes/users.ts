import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users, listings, orders, reviews, sellerVerifications } from '../db/schema.js';
import { eq, desc, and, sql, ne } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-()]/g, '');
  if (p.startsWith('0') && !p.startsWith('00') && !p.startsWith('+')) {
    p = '+251' + p.slice(1);
  } else if (!p.startsWith('+')) {
    p = '+' + p;
  }
  return p;
}

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(7).max(16).optional(),
  preferredLanguage: z.enum(['en', 'am', 'om']).optional(),
});

// GET /users/me
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      phone: user.phone,
      telegramId: user.telegramId ?? null,
      name: user.name,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /users/me
router.put('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { phone: rawPhone, ...rest } = updateProfileSchema.parse(req.body);

    const updateData: Record<string, any> = { ...rest };

    if (rawPhone !== undefined) {
      const normalized = normalizePhone(rawPhone);
      if (!/^\+[1-9]\d{6,14}$/.test(normalized)) {
        res.status(400).json({ error: 'Invalid phone number format' });
        return;
      }
      // Check uniqueness — exclude current user
      const [conflict] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.phone, normalized), ne(users.id, req.userId!)))
        .limit(1);
      if (conflict) {
        res.status(409).json({ error: 'This phone number is already in use.' });
        return;
      }
      updateData.phone = normalized;
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, req.userId!))
      .returning();

    res.json({
      id: user.id,
      phone: user.phone,
      name: user.name,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /users/:id/listings
router.get('/:id/listings', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const items = await db
      .select()
      .from(listings)
      .where(and(eq(listings.userId, req.params.id), eq(listings.status, 'active')))
      .orderBy(desc(listings.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      data: items.map((item) => ({
        ...item,
        quantity: item.quantity ? Number(item.quantity) : null,
        price: item.price ? Number(item.price) : null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      page,
      limit,
    });
  } catch (error) {
    console.error('Get user listings error:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// GET /users/:id/trust - Computed trust score
router.get('/:id/trust', async (req, res) => {
  try {
    const [user] = await db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, req.params.id))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const [[verification], [orderCount], [reviewStats]] = await Promise.all([
      db.select({ status: sellerVerifications.verificationStatus })
        .from(sellerVerifications)
        .where(eq(sellerVerifications.userId, req.params.id))
        .limit(1),
      db.select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(
          sql`(${orders.buyerId} = ${req.params.id} OR ${orders.sellerId} = ${req.params.id})`,
          eq(orders.status, 'completed')
        )),
      db.select({
          avg: sql<number>`round(avg(${reviews.rating})::numeric, 1)`,
          count: sql<number>`count(*)::int`,
        })
        .from(reviews)
        .where(eq(reviews.revieweeId, req.params.id)),
    ]);

    const isVerified = verification?.status === 'verified';
    const isPending = verification?.status === 'pending';
    const completedOrders = orderCount?.count ?? 0;
    const averageRating = reviewStats?.avg ? Number(reviewStats.avg) : null;
    const totalReviews = reviewStats?.count ?? 0;
    const memberSinceDays = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Trust score: 0-100
    const verificationPoints = isVerified ? 30 : isPending ? 10 : 0;
    const orderPoints = Math.min(completedOrders * 3, 30);
    const ratingPoints = averageRating ? (averageRating / 5) * 25 : 0;
    const agePoints = Math.min(memberSinceDays / 30, 15);
    const overallScore = Math.round(verificationPoints + orderPoints + ratingPoints + agePoints);

    res.json({
      overallScore,
      isVerified,
      completedOrders,
      averageRating,
      totalReviews,
      memberSinceDays,
    });
  } catch (error) {
    console.error('Get trust score error:', error);
    res.status(500).json({ error: 'Failed to compute trust score' });
  }
});

// PUT /users/push-token
router.put('/push-token', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Token required' });
      return;
    }
    await db
      .update(users)
      .set({ pushToken: token })
      .where(eq(users.id, req.userId!));
    res.json({ ok: true });
  } catch (error) {
    console.error('Save push token error:', error);
    res.status(500).json({ error: 'Failed to save push token' });
  }
});

export default router;
