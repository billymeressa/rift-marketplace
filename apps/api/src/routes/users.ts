import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users, listings } from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  telegramUsername: z.string().max(50).optional(),
  preferredLanguage: z.enum(['en', 'am']).optional(),
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
      name: user.name,
      telegramUsername: user.telegramUsername,
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
    const data = updateProfileSchema.parse(req.body);

    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, req.userId!))
      .returning();

    res.json({
      id: user.id,
      phone: user.phone,
      name: user.name,
      telegramUsername: user.telegramUsername,
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

export default router;
