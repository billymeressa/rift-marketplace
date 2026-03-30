const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || '';
const CHAPA_BASE_URL = 'https://api.chapa.co/v1';
const PLATFORM_FEE_RATE = 0.02; // 2%

export const PLATFORM_FEE_RATE_PCT = PLATFORM_FEE_RATE;

export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
}

export interface ChapaInitParams {
  amount: number;
  currency: string;
  buyerName: string;
  buyerEmail?: string;
  txRef: string;
  callbackUrl: string;
  returnUrl: string;
  title: string;
}

export interface ChapaInitResult {
  checkoutUrl: string;
  txRef: string;
}

export async function initializeChapaPayment(params: ChapaInitParams): Promise<ChapaInitResult> {
  if (!CHAPA_SECRET_KEY) {
    // Dev/sandbox mode — return a mock checkout URL
    return {
      checkoutUrl: `https://checkout.chapa.co/checkout/payment/${params.txRef}`,
      txRef: params.txRef,
    };
  }

  const [firstName, ...rest] = params.buyerName.trim().split(' ');
  const lastName = rest.join(' ') || '-';

  const response = await fetch(`${CHAPA_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amount.toFixed(2),
      currency: params.currency,
      email: params.buyerEmail || 'buyer@nilexport.com',
      first_name: firstName,
      last_name: lastName,
      tx_ref: params.txRef,
      callback_url: params.callbackUrl,
      return_url: params.returnUrl,
      title: params.title,
      description: 'Agricultural commodity escrow — Nile Xport',
    }),
  });

  const data = await response.json();
  if (data.status !== 'success') {
    throw new Error(data.message || 'Payment initialization failed');
  }

  return {
    checkoutUrl: data.data.checkout_url,
    txRef: params.txRef,
  };
}

export async function verifyChapaPayment(
  txRef: string
): Promise<{ status: 'success' | 'failed' | 'pending'; chapaRef?: string; raw?: any }> {
  if (!CHAPA_SECRET_KEY) {
    // Dev mode: always return pending (webhook simulation handles success)
    return { status: 'pending' };
  }

  const response = await fetch(`${CHAPA_BASE_URL}/transaction/verify/${txRef}`, {
    headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` },
  });

  const data = await response.json();
  const txStatus = data.data?.status;

  if (txStatus === 'success') return { status: 'success', chapaRef: data.data?.reference, raw: data.data };
  if (txStatus === 'failed') return { status: 'failed', raw: data.data };
  return { status: 'pending', raw: data.data };
}

export function generateTxRef(orderId: string): string {
  const short = orderId.replace(/-/g, '').slice(0, 12);
  const ts = Date.now().toString(36).toUpperCase();
  return `NX-${short}-${ts}`;
}
