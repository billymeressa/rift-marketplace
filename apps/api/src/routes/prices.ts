import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { commodityPrices } from '../db/schema.js';

const router = Router();

// GET /api/v1/prices — public, no auth required
router.get('/', async (_req, res) => {
  try {
    const prices = await db
      .select()
      .from(commodityPrices)
      .orderBy(commodityPrices.commodity);
    res.json({ data: prices });
  } catch (err: any) {
    console.error('prices GET error:', err);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// PUT /api/v1/prices/:commodity — admin update (requires admin key)
router.put('/:commodity', async (req, res) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || req.headers['x-admin-key'] !== adminKey) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const { commodity } = req.params;

  const body = z.object({
    price: z.number().positive(),
    prevPrice: z.number().positive().optional(),
    currency: z.string().max(5).optional(),
    unit: z.string().max(30).optional(),
    tradeTerm: z.string().max(20).optional(),
    market: z.string().max(100).optional(),
    source: z.string().max(100).optional(),
  }).parse(req.body);

  try {
    const [updated] = await db
      .update(commodityPrices)
      .set({ ...body, updatedAt: new Date(), recordedAt: new Date() })
      .where(eq(commodityPrices.commodity, commodity))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Commodity not found' });
      return;
    }
    res.json({ data: updated });
  } catch (err: any) {
    console.error('prices PUT error:', err);
    res.status(500).json({ error: 'Failed to update price' });
  }
});

export default router;
