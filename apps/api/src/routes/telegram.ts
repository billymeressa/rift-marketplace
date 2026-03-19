import { Router } from 'express';
import { handleTelegramUpdate } from '../services/telegram.js';

const router = Router();

router.post('/webhook', async (req, res) => {
  try {
    await handleTelegramUpdate(req.body);
    res.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.json({ ok: true }); // Always 200 so Telegram doesn't retry
  }
});

export default router;
