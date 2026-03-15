import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { listings, users } from '../db/schema.js';
import { eq, and, desc, ilike, or, sql, SQL } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const createListingSchema = z.object({
  type: z.enum(['buy', 'sell']),
  productCategory: z.enum(['coffee', 'sesame', 'mung_bean', 'oilseed', 'spice', 'equipment', 'other']),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  region: z.string().max(30).optional(),
  grade: z.number().int().min(1).max(5).optional(),
  process: z.enum(['washed', 'natural', 'unwashed']).optional(),
  transactionType: z.enum(['vertical', 'horizontal']).optional(),
  quantity: z.number().positive().optional(),
  unit: z.enum(['bags', 'quintals', 'fcl', 'kg', 'tons']).optional(),
  price: z.number().positive().optional(),
  currency: z.enum(['ETB', 'USD']).optional(),
});

const updateListingSchema = createListingSchema.partial();

// GET /listings - Browse with filters
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(listings.status, 'active')];

    // 30-day expiry filter
    conditions.push(
      sql`${listings.createdAt} > now() - interval '30 days'`
    );

    if (req.query.type) {
      conditions.push(eq(listings.type, req.query.type as string));
    }
    if (req.query.productCategory) {
      conditions.push(eq(listings.productCategory, req.query.productCategory as string));
    }
    if (req.query.region) {
      conditions.push(eq(listings.region, req.query.region as string));
    }
    if (req.query.grade) {
      conditions.push(eq(listings.grade, parseInt(req.query.grade as string)));
    }
    if (req.query.process) {
      conditions.push(eq(listings.process, req.query.process as string));
    }
    if (req.query.transactionType) {
      conditions.push(eq(listings.transactionType, req.query.transactionType as string));
    }
    if (req.query.search) {
      const search = `%${req.query.search}%`;
      conditions.push(
        or(
          ilike(listings.title, search),
          ilike(listings.description, search)
        )!
      );
    }

    const where = and(...conditions);

    const [items, countResult] = await Promise.all([
      db
        .select({
          id: listings.id,
          userId: listings.userId,
          type: listings.type,
          productCategory: listings.productCategory,
          title: listings.title,
          description: listings.description,
          region: listings.region,
          grade: listings.grade,
          process: listings.process,
          transactionType: listings.transactionType,
          quantity: listings.quantity,
          unit: listings.unit,
          price: listings.price,
          currency: listings.currency,
          status: listings.status,
          createdAt: listings.createdAt,
          updatedAt: listings.updatedAt,
          userName: users.name,
          userPhone: users.phone,
          userTelegram: users.telegramUsername,
        })
        .from(listings)
        .leftJoin(users, eq(listings.userId, users.id))
        .where(where)
        .orderBy(desc(listings.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(listings)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;

    res.json({
      data: items.map((item) => ({
        ...item,
        quantity: item.quantity ? Number(item.quantity) : null,
        price: item.price ? Number(item.price) : null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        user: {
          id: item.userId,
          name: item.userName,
          phone: item.userPhone,
          telegramUsername: item.userTelegram,
        },
      })),
      page,
      limit,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('List listings error:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// GET /listings/:id
router.get('/:id', async (req, res) => {
  try {
    const [item] = await db
      .select({
        id: listings.id,
        userId: listings.userId,
        type: listings.type,
        productCategory: listings.productCategory,
        title: listings.title,
        description: listings.description,
        region: listings.region,
        grade: listings.grade,
        process: listings.process,
        transactionType: listings.transactionType,
        quantity: listings.quantity,
        unit: listings.unit,
        price: listings.price,
        currency: listings.currency,
        status: listings.status,
        createdAt: listings.createdAt,
        updatedAt: listings.updatedAt,
        userName: users.name,
        userPhone: users.phone,
        userTelegram: users.telegramUsername,
      })
      .from(listings)
      .leftJoin(users, eq(listings.userId, users.id))
      .where(eq(listings.id, req.params.id as string))
      .limit(1);

    if (!item) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    res.json({
      ...item,
      quantity: item.quantity ? Number(item.quantity) : null,
      price: item.price ? Number(item.price) : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      user: {
        id: item.userId,
        name: item.userName,
        phone: item.userPhone,
        telegramUsername: item.userTelegram,
      },
    });
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// POST /listings (auth required)
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = createListingSchema.parse(req.body);

    const [listing] = await db
      .insert(listings)
      .values({
        userId: req.userId!,
        type: data.type,
        productCategory: data.productCategory,
        title: data.title,
        description: data.description,
        region: data.region,
        grade: data.grade,
        process: data.process,
        transactionType: data.transactionType,
        quantity: data.quantity != null ? String(data.quantity) : null,
        unit: data.unit,
        price: data.price != null ? String(data.price) : null,
        currency: data.currency ?? 'ETB',
      })
      .returning();

    res.status(201).json({
      ...listing,
      quantity: listing.quantity ? Number(listing.quantity) : null,
      price: listing.price ? Number(listing.price) : null,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create listing error:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// PUT /listings/:id (auth required, own listing only)
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = updateListingSchema.parse(req.body);

    const id = req.params.id as string;
    const [existing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    if (existing.userId !== req.userId) {
      res.status(403).json({ error: 'Not authorized to edit this listing' });
      return;
    }

    const updateData: Record<string, any> = { ...data, updatedAt: new Date() };
    if (data.quantity != null) updateData.quantity = String(data.quantity);
    if (data.price != null) updateData.price = String(data.price);

    const [updated] = await db
      .update(listings)
      .set(updateData)
      .where(eq(listings.id, id))
      .returning();

    res.json({
      ...updated,
      quantity: updated.quantity ? Number(updated.quantity) : null,
      price: updated.price ? Number(updated.price) : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update listing error:', error);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// DELETE /listings/:id (auth required, own listing only - soft delete)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const [existing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    if (existing.userId !== req.userId) {
      res.status(403).json({ error: 'Not authorized to delete this listing' });
      return;
    }

    await db
      .update(listings)
      .set({ status: 'closed', updatedAt: new Date() })
      .where(eq(listings.id, id));

    res.json({ message: 'Listing closed' });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ error: 'Failed to close listing' });
  }
});

export default router;
