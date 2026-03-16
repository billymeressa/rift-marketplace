import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { reviews, orders, users } from '../db/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const createReviewSchema = z.object({
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// POST /reviews - Leave a review for a completed order
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = createReviewSchema.parse(req.body);

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, data.orderId))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status !== 'completed') {
      res.status(400).json({ error: 'Can only review completed orders' });
      return;
    }

    if (order.buyerId !== req.userId && order.sellerId !== req.userId) {
      res.status(403).json({ error: 'Not authorized to review this order' });
      return;
    }

    // Determine who is being reviewed
    const revieweeId = order.buyerId === req.userId ? order.sellerId : order.buyerId;

    // Check for existing review
    const [existing] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.orderId, data.orderId), eq(reviews.reviewerId, req.userId!)))
      .limit(1);

    if (existing) {
      res.status(400).json({ error: 'You have already reviewed this order' });
      return;
    }

    const [review] = await db
      .insert(reviews)
      .values({
        orderId: data.orderId,
        reviewerId: req.userId!,
        revieweeId,
        rating: data.rating,
        comment: data.comment,
      })
      .returning();

    res.status(201).json({
      ...review,
      createdAt: review.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// GET /reviews/user/:id - Get reviews for a user + aggregate
router.get('/user/:id', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const [items, countResult, avgResult] = await Promise.all([
      db
        .select({
          id: reviews.id,
          orderId: reviews.orderId,
          reviewerId: reviews.reviewerId,
          revieweeId: reviews.revieweeId,
          rating: reviews.rating,
          comment: reviews.comment,
          createdAt: reviews.createdAt,
          reviewerName: users.name,
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.reviewerId, users.id))
        .where(eq(reviews.revieweeId, req.params.id))
        .orderBy(desc(reviews.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(reviews)
        .where(eq(reviews.revieweeId, req.params.id)),
      db
        .select({ avg: sql<number>`round(avg(${reviews.rating})::numeric, 1)` })
        .from(reviews)
        .where(eq(reviews.revieweeId, req.params.id)),
    ]);

    const total = countResult[0]?.count ?? 0;
    const averageRating = avgResult[0]?.avg ?? null;

    res.json({
      data: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        reviewer: { id: item.reviewerId, name: item.reviewerName },
      })),
      averageRating: averageRating ? Number(averageRating) : null,
      totalReviews: total,
      page,
      limit,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

export default router;
