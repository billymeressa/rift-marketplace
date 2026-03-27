import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { listings, users, sellerVerifications } from '../db/schema.js';
import { eq, and, desc, ilike, or, sql, ne, SQL, inArray, leftJoin } from 'drizzle-orm';
import { sendPushNotifications } from '../lib/notify.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const createListingSchema = z.object({
  type: z.enum(['buy', 'sell']),
  productCategory: z.string().min(1).max(50),
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  region: z.string().max(50).optional(),
  grade: z.number().int().min(1).max(5).optional(),
  process: z.string().max(30).optional(),
  transactionType: z.string().max(30).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().max(20).optional(),
  price: z.number().positive().optional(),
  currency: z.enum(['ETB', 'USD']).optional(),
  images: z.array(z.string().url()).max(5).optional(),
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
      const cats = (req.query.productCategory as string).split(',').map(c => c.trim()).filter(Boolean);
      if (cats.length === 1) {
        conditions.push(eq(listings.productCategory, cats[0]));
      } else if (cats.length > 1) {
        conditions.push(inArray(listings.productCategory, cats));
      }
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
          images: listings.images,
          status: listings.status,
          createdAt: listings.createdAt,
          updatedAt: listings.updatedAt,
          userName: users.name,
          userPhone: users.phone,
          sellerVerified: sql<boolean>`(${sellerVerifications.verificationStatus} = 'approved')`,
        })
        .from(listings)
        .leftJoin(users, eq(listings.userId, users.id))
        .leftJoin(sellerVerifications, eq(listings.userId, sellerVerifications.userId))
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
        images: listings.images,
        status: listings.status,
        createdAt: listings.createdAt,
        updatedAt: listings.updatedAt,
        userName: users.name,
        userPhone: users.phone,
        userTelegram: users.telegramUsername,
        sellerVerified: sql<boolean>`(${sellerVerifications.verificationStatus} = 'approved')`,
        sellerBusinessName: sellerVerifications.businessName,
        sellerBusinessType: sellerVerifications.businessType,
      })
      .from(listings)
      .leftJoin(users, eq(listings.userId, users.id))
      .leftJoin(sellerVerifications, eq(listings.userId, sellerVerifications.userId))
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
        verified: !!item.sellerVerified,
        businessName: item.sellerBusinessName ?? null,
        businessType: item.sellerBusinessType ?? null,
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

    const autoTitle = data.title || (() => {
      // Readable English labels for the stored title (used in chat context + search)
      const CONDITION_SHORT: Record<string, string> = {
        washed: 'Washed', natural: 'Natural', honey: 'Honey',
        organic: 'Organic', processed: 'Processed', fresh: 'Fresh', dried: 'Dried',
      };
      const REGION_EN: Record<string, string> = {
        addis_ababa: 'Addis Ababa', oromia: 'Oromia', amhara: 'Amhara',
        snnpr: 'South Ethiopia', tigray: 'Tigray', somali: 'Somali',
        afar: 'Afar', benishangul: 'Benishangul-Gumuz', gambela: 'Gambela',
        harari: 'Harari', dire_dawa: 'Dire Dawa', sidama: 'Sidama',
        south_west: 'South West Ethiopia', central: 'Central Ethiopia',
      };
      // Convert snake_case product key to Title Case (e.g. green_coffee → Green Coffee)
      const productName = data.productCategory
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      const parts: string[] = [];
      if (data.grade) parts.push(`G${data.grade}`);
      if (data.process && data.process !== 'raw' && CONDITION_SHORT[data.process]) {
        parts.push(CONDITION_SHORT[data.process]);
      }
      parts.push(productName);

      let title = parts.join(' ');
      if (data.region) {
        const region = REGION_EN[data.region] ?? data.region.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        title += ` — ${region}`;
      }
      return title;
    })();

    const [listing] = await db
      .insert(listings)
      .values({
        userId: req.userId!,
        type: data.type,
        productCategory: data.productCategory,
        title: autoTitle,
        description: data.description,
        region: data.region,
        grade: data.grade,
        process: data.process,
        transactionType: data.transactionType,
        quantity: data.quantity != null ? String(data.quantity) : null,
        unit: data.unit,
        price: data.price != null ? String(data.price) : null,
        currency: data.currency ?? 'ETB',
        images: data.images ?? [],
      })
      .returning();

    res.status(201).json({
      ...listing,
      quantity: listing.quantity ? Number(listing.quantity) : null,
      price: listing.price ? Number(listing.price) : null,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
    });

    // Fire-and-forget: notify users with matching opposite listings
    const oppositeType = data.type === 'sell' ? 'buy' : 'sell';
    db.select({ pushToken: users.pushToken, id: users.id })
      .from(listings)
      .leftJoin(users, eq(listings.userId, users.id))
      .where(and(
        eq(listings.type, oppositeType),
        eq(listings.productCategory, data.productCategory),
        eq(listings.status, 'active'),
        ne(listings.userId, req.userId!),
        sql`${users.pushToken} is not null`,
        sql`${listings.createdAt} > now() - interval '30 days'`,
      ))
      .then(matchingUsers => {
        const messages = matchingUsers
          .filter(u => u.pushToken)
          .map(u => ({
            to: u.pushToken!,
            title: data.type === 'sell'
              ? `New ${data.productCategory} available`
              : `New buyer for ${data.productCategory}`,
            body: data.type === 'sell'
              ? `${data.quantity ? data.quantity + ' ' + (data.unit || '') + ' for sale' : 'Now available'}${data.region ? ' · ' + data.region : ''}`
              : `Looking to buy ${data.productCategory}${data.region ? ' · ' + data.region : ''}`,
            data: { listingId: listing.id, screen: 'listing' },
          }));
        return sendPushNotifications(messages);
      })
      .catch(err => console.error('Notification trigger error:', err));
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
