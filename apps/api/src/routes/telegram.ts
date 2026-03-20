import { Router } from 'express';
import { db } from '../db/client.js';
import { otpCodes } from '../db/schema.js';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { sendTelegramMessage } from '../lib/telegram.js';

const router = Router();

// Telegram Bot webhook — receives updates when users press "Start"
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    const message = update?.message;

    if (!message?.text || !message?.chat?.id) {
      res.sendStatus(200);
      return;
    }

    const text = message.text.trim();
    const chatId = message.chat.id;

    // Handle /start SESSION_ID — user clicked the deep link
    if (text.startsWith('/start ')) {
      const session = text.slice(7).trim();

      if (!session) {
        await sendTelegramMessage(chatId, 'Invalid link. Please request a new code from the app.');
        res.sendStatus(200);
        return;
      }

      const now = new Date();

      // Find the OTP record matching this session
      const [otp] = await db
        .select()
        .from(otpCodes)
        .where(
          and(
            eq(otpCodes.session, session),
            gt(otpCodes.expiresAt, now),
            isNull(otpCodes.usedAt),
          )
        )
        .limit(1);

      if (!otp) {
        await sendTelegramMessage(chatId, 'This link has expired. Please request a new code from the app.');
        res.sendStatus(200);
        return;
      }

      // Send the OTP code to the user's Telegram chat
      await sendTelegramMessage(
        chatId,
        `<b>Your Nile Xport verification code:</b>\n\n<code>${otp.code}</code>\n\nValid for 10 minutes. Never share this code with anyone.`
      );
    } else {
      // Generic response for any other message
      await sendTelegramMessage(
        chatId,
        'Welcome to Nile Xport! Use this bot to receive verification codes.\n\nOpen the Nile Xport app to get started.'
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Telegram webhook error:', err);
    res.sendStatus(200); // Always return 200 to Telegram
  }
});

export default router;
