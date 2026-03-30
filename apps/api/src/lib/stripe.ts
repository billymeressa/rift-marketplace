import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Stripe supports these currencies natively (lowercase ISO codes)
export const STRIPE_SUPPORTED_CURRENCIES = ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'cny', 'aed', 'sgd', 'chf'];

export function isSupportedByStripe(currency: string): boolean {
  return STRIPE_SUPPORTED_CURRENCIES.includes(currency.toLowerCase());
}

function getStripeClient(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' });
}

export interface StripeInitParams {
  amount: number;           // in the currency's major unit (e.g. USD dollars)
  currency: string;         // ISO 4217 e.g. 'usd'
  txRef: string;            // our internal reference stored in metadata
  orderId: string;
  productTitle: string;
  quantity: number;
  unit: string;
  successUrl: string;
  cancelUrl: string;
}

export interface StripeInitResult {
  checkoutUrl: string;
  sessionId: string;
  txRef: string;
}

export async function initializeStripePayment(params: StripeInitParams): Promise<StripeInitResult> {
  if (!STRIPE_SECRET_KEY) {
    // Dev sandbox — return a mock URL
    return {
      checkoutUrl: `https://checkout.stripe.com/c/pay/mock_${params.txRef}`,
      sessionId: `cs_mock_${params.txRef}`,
      txRef: params.txRef,
    };
  }

  const stripe = getStripeClient();

  // Stripe expects amount in smallest currency unit (cents for USD)
  const amountCents = Math.round(params.amount * 100);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: params.currency.toLowerCase(),
          unit_amount: amountCents,
          product_data: {
            name: params.productTitle,
            description: `${params.quantity} ${params.unit} — Nile Xport Escrow`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      txRef: params.txRef,
      orderId: params.orderId,
      platform: 'nilexport',
    },
    payment_intent_data: {
      metadata: {
        txRef: params.txRef,
        orderId: params.orderId,
      },
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  if (!session.url) throw new Error('Stripe did not return a checkout URL');

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    txRef: params.txRef,
  };
}

export async function verifyStripeSession(
  sessionId: string
): Promise<{ status: 'success' | 'failed' | 'pending'; paymentIntentId?: string }> {
  if (!STRIPE_SECRET_KEY) {
    return { status: 'pending' };
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status === 'paid') {
    return {
      status: 'success',
      paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
    };
  }
  if (session.status === 'expired') {
    return { status: 'failed' };
  }
  return { status: 'pending' };
}

export function constructStripeEvent(payload: Buffer, signature: string): Stripe.Event {
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
}
