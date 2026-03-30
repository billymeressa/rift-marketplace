import { Router } from 'express';
import { db } from '../db/client.js';
import { orders, payments } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import express from 'express';
import { constructStripeEvent, STRIPE_WEBHOOK_SECRET } from '../lib/stripe.js';
import { verifyTelebirrSignature } from '../lib/telebirr.js';

const router = Router();

function addStatusEntry(history: any[], status: string, note?: string) {
  return [...history, { status, timestamp: new Date().toISOString(), note }];
}

async function confirmPaymentForOrder(orderId: string, txRef: string, ref: string, gateway: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.status !== 'accepted') return;

  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  await db.update(orders)
    .set({
      status: 'payment_held',
      escrowStatus: 'held',
      statusHistory: addStatusEntry(history, 'payment_held', `Payment confirmed via ${gateway} — Ref: ${ref}`),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));
}

// ─── Chapa Webhook ────────────────────────────────────────────────────────────
// POST /payments/webhook/chapa
router.post('/webhook/chapa', async (req, res) => {
  try {
    const chapaSignature = req.headers['chapa-signature'] as string;
    const webhookSecret = process.env.CHAPA_WEBHOOK_SECRET;

    if (webhookSecret && chapaSignature) {
      const computed = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      if (computed !== chapaSignature) {
        console.warn('Chapa webhook: invalid signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    const { tx_ref, status, reference } = req.body;
    if (!tx_ref) { res.status(400).json({ error: 'Missing tx_ref' }); return; }

    const [payment] = await db.select().from(payments).where(eq(payments.txRef, tx_ref)).limit(1);
    if (!payment) { res.status(200).json({ received: true }); return; }
    if (payment.status === 'success') { res.status(200).json({ received: true }); return; }

    const paymentStatus = status === 'success' ? 'success' : 'failed';
    await db.update(payments)
      .set({ status: paymentStatus, chapaRef: reference || null, chapaResponse: req.body, updatedAt: new Date() })
      .where(eq(payments.txRef, tx_ref));

    if (paymentStatus === 'success') {
      await confirmPaymentForOrder(payment.orderId, tx_ref, reference || tx_ref, 'Chapa');
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Chapa webhook error:', error);
    res.status(200).json({ received: true });
  }
});

// Legacy alias — keep old URL working during transition
router.post('/webhook', async (req, res, next) => {
  req.url = '/webhook/chapa';
  next();
});

// ─── Stripe Webhook ───────────────────────────────────────────────────────────
// POST /payments/webhook/stripe
// IMPORTANT: Stripe requires the raw request body for signature verification.
// This route uses express.raw() before the global express.json() middleware.
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature' });
    return;
  }

  let event: ReturnType<typeof constructStripeEvent>;
  try {
    event = constructStripeEvent(req.body as Buffer, signature);
  } catch (err: any) {
    console.warn('Stripe webhook signature verification failed:', err.message);
    res.status(400).json({ error: `Webhook error: ${err.message}` });
    return;
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const txRef = session.metadata?.txRef;
      const orderId = session.metadata?.orderId;

      if (!txRef || !orderId) {
        res.status(200).json({ received: true });
        return;
      }

      const [payment] = await db.select().from(payments).where(eq(payments.txRef, txRef)).limit(1);
      if (payment && payment.status !== 'success') {
        await db.update(payments)
          .set({
            status: 'success',
            chapaRef: session.payment_intent || null,
            chapaResponse: session,
            updatedAt: new Date(),
          })
          .where(eq(payments.txRef, txRef));

        await confirmPaymentForOrder(orderId, txRef, session.payment_intent || txRef, 'Stripe');
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as any;
      const txRef = session.metadata?.txRef;
      if (txRef) {
        await db.update(payments)
          .set({ status: 'failed', updatedAt: new Date() })
          .where(eq(payments.txRef, txRef));
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing error:', error);
    res.status(200).json({ received: true });
  }
});

// ─── Telebirr Webhook ─────────────────────────────────────────────────────────
// POST /payments/webhook/telebirr
router.post('/webhook/telebirr', async (req, res) => {
  try {
    const { outTradeNo, tradeStatus, tradeNo, sign, ...rest } = req.body;

    // Verify Telebirr signature
    if (sign) {
      const isValid = verifyTelebirrSignature({ outTradeNo, tradeStatus, tradeNo, ...rest }, sign);
      if (!isValid) {
        console.warn('Telebirr webhook: invalid signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    if (!outTradeNo) { res.status(400).json({ error: 'Missing outTradeNo' }); return; }

    const [payment] = await db.select().from(payments).where(eq(payments.txRef, outTradeNo)).limit(1);
    if (!payment) { res.status(200).json({ code: '0', msg: 'success' }); return; }
    if (payment.status === 'success') { res.status(200).json({ code: '0', msg: 'success' }); return; }

    // Telebirr sends 'TRADE_SUCCESS' on success
    const isSuccess = tradeStatus === 'TRADE_SUCCESS';
    const isFailed = tradeStatus === 'TRADE_CLOSED' || tradeStatus === 'TRADE_FAIL';

    await db.update(payments)
      .set({
        status: isSuccess ? 'success' : isFailed ? 'failed' : 'pending',
        chapaRef: tradeNo || null,
        chapaResponse: req.body,
        updatedAt: new Date(),
      })
      .where(eq(payments.txRef, outTradeNo));

    if (isSuccess) {
      await confirmPaymentForOrder(payment.orderId, outTradeNo, tradeNo || outTradeNo, 'Telebirr');
    }

    // Telebirr expects { code: '0', msg: 'success' } to stop retries
    res.status(200).json({ code: '0', msg: 'success' });
  } catch (error) {
    console.error('Telebirr webhook error:', error);
    res.status(200).json({ code: '0', msg: 'success' });
  }
});

// ─── Dev sandbox ─────────────────────────────────────────────────────────────
// POST /payments/dev-confirm/:txRef — simulate payment success (no real keys needed)
router.post('/dev-confirm/:txRef', async (req, res) => {
  if (process.env.STRIPE_SECRET_KEY || process.env.CHAPA_SECRET_KEY) {
    res.status(403).json({ error: 'Not available when payment keys are configured' });
    return;
  }

  try {
    const { txRef } = req.params;
    const [payment] = await db.select().from(payments).where(eq(payments.txRef, txRef)).limit(1);
    if (!payment) { res.status(404).json({ error: 'Payment not found' }); return; }

    await db.update(payments)
      .set({ status: 'success', chapaRef: `DEV-${Date.now()}`, updatedAt: new Date() })
      .where(eq(payments.txRef, txRef));

    await confirmPaymentForOrder(payment.orderId, txRef, `DEV-${txRef}`, `${payment.gateway} (dev)`);

    res.json({ success: true, orderId: payment.orderId });
  } catch (error) {
    console.error('Dev confirm error:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
