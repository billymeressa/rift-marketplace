import { Router } from 'express';
import { db } from '../db/client.js';
import { listings, users } from '../db/schema.js';
import { eq, and, inArray, ne, sql, desc, SQL } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /recommendations — personalised matches for the logged-in user
// - user's BUY listings → matching SELL listings
// - user's SELL listings → matching BUY listings
// Scored: same region (+1), same grade (+1). Sorted by score desc, recency asc.
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    // Get user's own active listings
    const myListings = await db
      .select({
        type: listings.type,
        productCategory: listings.productCategory,
        region: listings.region,
        grade: listings.grade,
      })
      .from(listings)
      .where(
        and(
          eq(listings.userId, userId),
          eq(listings.status, 'active'),
          sql`${listings.createdAt} > now() - interval '60 days'`
        )
      )
      .limit(20);

    if (myListings.length === 0) {
      res.json({ data: [] });
      return;
    }

    // Derive what to look for
    // buy → look for sells; sell → look for buys
    const wantedProducts = new Map<string, { region?: string | null; grade?: number | null }[]>();

    for (const l of myListings) {
      const oppositeType = l.type === 'buy' ? 'sell' : 'buy';
      const key = `${oppositeType}:${l.productCategory}`;
      if (!wantedProducts.has(key)) wantedProducts.set(key, []);
      wantedProducts.get(key)!.push({ region: l.region, grade: l.grade });
    }

    // Build a map: productCategory → opposite type to fetch
    const productTypeMap = new Map<string, Set<string>>();
    for (const key of wantedProducts.keys()) {
      const [type, ...rest] = key.split(':');
      const product = rest.join(':');
      if (!productTypeMap.has(product)) productTypeMap.set(product, new Set());
      productTypeMap.get(product)!.add(type);
    }

    const productCategories = [...productTypeMap.keys()];

    if (productCategories.length === 0) {
      res.json({ data: [] });
      return;
    }

    // Fetch candidate listings
    const candidates = await db
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
      })
      .from(listings)
      .leftJoin(users, eq(listings.userId, users.id))
      .where(
        and(
          ne(listings.userId, userId),
          eq(listings.status, 'active'),
          inArray(listings.productCategory, productCategories),
          sql`${listings.createdAt} > now() - interval '30 days'`
        )
      )
      .orderBy(desc(listings.createdAt))
      .limit(100);

    // Score each candidate
    const scored = candidates
      .filter((c) => {
        // Only include if type matches what we want
        const types = productTypeMap.get(c.productCategory);
        return types?.has(c.type);
      })
      .map((c) => {
        // Find best matching source listing
        const key = `${c.type}:${c.productCategory}`;
        const sources = wantedProducts.get(key) || [];
        let bestScore = 0;
        let matchReason = c.type === 'sell' ? 'Matches your buy request' : 'Matches your sell listing';

        for (const src of sources) {
          let score = 1; // base: same product
          if (src.region && c.region && src.region === c.region) score += 2;
          if (src.grade != null && c.grade != null && src.grade === c.grade) score += 1;
          if (score > bestScore) {
            bestScore = score;
            if (score >= 3) {
              matchReason = c.type === 'sell'
                ? `Sell in ${c.region ?? 'your region'} matches your buy`
                : `Buyer in ${c.region ?? 'your region'} matches your sell`;
            }
          }
        }

        return { ...c, score: bestScore, matchReason };
      })
      .sort((a, b) => b.score - a.score || b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 15);

    res.json({
      data: scored.map((item) => ({
        id: item.id,
        type: item.type,
        productCategory: item.productCategory,
        title: item.title,
        description: item.description,
        region: item.region,
        grade: item.grade,
        process: item.process,
        transactionType: item.transactionType,
        quantity: item.quantity ? Number(item.quantity) : null,
        unit: item.unit,
        price: item.price ? Number(item.price) : null,
        currency: item.currency,
        images: item.images,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        matchReason: item.matchReason,
        user: {
          id: item.userId,
          name: item.userName,
          phone: item.userPhone,
          telegramUsername: item.userTelegram,
        },
      })),
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

export default router;
