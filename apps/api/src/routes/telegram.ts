import { Router } from 'express';
import { db } from '../db/client.js';
import { otpCodes, users } from '../db/schema.js';
import { eq, and, gt, isNull, not } from 'drizzle-orm';
import { sendTelegramMessage, sendContactRequest, removeKeyboard } from '../lib/telegram.js';

const router = Router();

function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-()]/g, '');
  if (!p.startsWith('+')) p = '+' + p;
  return p;
}

// Telegram Bot webhook — receives updates from Telegram
router.post('/webhook', async (req, res) => {
  res.sendStatus(200); // Always respond immediately so Telegram doesn't retry

  try {
    const update = req.body;
    const message = update?.message;
    if (!message?.chat?.id) return;

    const chatId = message.chat.id;
    const fromId = message.from?.id;

    // ── Handle contact sharing ─────────────────────────────────────────────
    if (message.contact) {
      const contact = message.contact;

      // Security: only accept the user's own contact, not a forwarded one
      if (!contact.user_id || contact.user_id !== fromId) {
        await removeKeyboard(chatId, '⚠️ Please share <b>your own</b> phone number using the button below.');
        return;
      }

      const telegramId = String(fromId);
      const phone = normalizePhone(contact.phone_number ?? '');

      // Find the account linked to this Telegram ID
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.telegramId, telegramId))
        .limit(1);

      if (!user) {
        await removeKeyboard(chatId,
          '⚠️ No account found for your Telegram. Please sign up first by opening the app.'
        );
        return;
      }

      // Check phone isn't already taken by a different account
      const [conflict] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.phone, phone), not(eq(users.id, user.id))))
        .limit(1);

      if (conflict) {
        await removeKeyboard(chatId,
          '⚠️ This phone number is already linked to another account. Please contact support.'
        );
        return;
      }

      // Save the verified phone number
      await db.update(users).set({ phone }).where(eq(users.id, user.id));

      await removeKeyboard(chatId,
        `✅ <b>Phone number linked!</b>\n\n<code>${phone}</code> is now verified on your Nile Xport account.\n\nYou can go back to the app.`
      );
      return;
    }

    // ── Handle text messages ───────────────────────────────────────────────
    if (!message.text) return;

    const text = message.text.trim();

    // /start SESSION — OTP deep link
    if (text.startsWith('/start ') && text.length > 7) {
      const session = text.slice(7).trim();
      const now = new Date();

      const [otp] = await db
        .select()
        .from(otpCodes)
        .where(and(
          eq(otpCodes.session, session),
          gt(otpCodes.expiresAt, now),
          isNull(otpCodes.usedAt),
        ))
        .limit(1);

      if (!otp) {
        await sendTelegramMessage(chatId, '⚠️ This link has expired. Please request a new code from the app.');
        return;
      }

      await sendTelegramMessage(
        chatId,
        `<b>Your Nile Xport verification code:</b>\n\n<code>${otp.code}</code>\n\nValid for 10 minutes. Never share this code with anyone.`
      );
      return;
    }

    // /start or /link — show contact share button
    if (text === '/start' || text === '/link') {
      // If user already has a phone linked, tell them
      if (fromId) {
        const [user] = await db
          .select({ phone: users.phone })
          .from(users)
          .where(eq(users.telegramId, String(fromId)))
          .limit(1);

        if (user?.phone) {
          await sendTelegramMessage(chatId,
            `✅ Your phone number <code>${user.phone}</code> is already linked to your Nile Xport account.\n\nOpen the app to continue.`
          );
          return;
        }
      }

      await sendContactRequest(chatId,
        'Welcome to <b>Nile Xport</b>! 🌿\n\nTap the button below to link your verified Telegram phone number to your account.\n\n<i>This ensures your account is tied to your real number.</i>'
      );
      return;
    }

    // Any other message — prompt to share phone
    await sendContactRequest(chatId,
      'Tap the button below to link your phone number to your Nile Xport account.'
    );

  } catch (err) {
    console.error('Telegram webhook error:', err);
  }
});

export default router;
