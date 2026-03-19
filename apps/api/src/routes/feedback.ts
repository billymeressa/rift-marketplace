import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { feedback } from '../db/schema.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'general', 'complaint']),
  message: z.string().max(1000).optional(),
  nps: z.number().int().min(1).max(10).optional(),
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const data = feedbackSchema.parse(req.body);

    const [entry] = await db
      .insert(feedback)
      .values({
        userId: authReq.userId!,
        type: data.type,
        message: data.message ?? null,
        nps: data.nps ?? null,
      })
      .returning();

    res.status(201).json({ id: entry.id, message: 'Feedback received' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

export default router;
