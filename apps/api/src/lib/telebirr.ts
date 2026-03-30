import crypto from 'crypto';

const TELEBIRR_APP_ID = process.env.TELEBIRR_APP_ID || '';
const TELEBIRR_APP_KEY = process.env.TELEBIRR_APP_KEY || '';
const TELEBIRR_MERCHANT_CODE = process.env.TELEBIRR_MERCHANT_CODE || '';
const TELEBIRR_SHORT_CODE = process.env.TELEBIRR_SHORT_CODE || '';
// Merchant RSA private key (PEM) for signing requests
const TELEBIRR_PRIVATE_KEY = (process.env.TELEBIRR_PRIVATE_KEY || '').replace(/\\n/g, '\n');
// Telebirr's RSA public key (PEM) for verifying webhook callbacks
const TELEBIRR_PUBLIC_KEY = (process.env.TELEBIRR_PUBLIC_KEY || '').replace(/\\n/g, '\n');

const TELEBIRR_API_URL = 'https://payment.ethiotelecom.et/payment/paymentRequest';

export interface TelebirrInitParams {
  amount: number;
  txRef: string;
  subject: string;
  notifyUrl: string;
  returnUrl: string;
}

export interface TelebirrInitResult {
  checkoutUrl: string;
  txRef: string;
}

function buildSignString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
}

function rsaSign(data: string, privateKeyPem: string): string {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(data, 'utf8');
  return signer.sign(privateKeyPem, 'base64');
}

export function verifyTelebirrSignature(params: Record<string, string>, signature: string): boolean {
  if (!TELEBIRR_PUBLIC_KEY) return true; // Skip in dev
  try {
    const signStr = buildSignString(
      Object.fromEntries(Object.entries(params).filter(([k]) => k !== 'sign'))
    );
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(signStr, 'utf8');
    return verifier.verify(TELEBIRR_PUBLIC_KEY, signature, 'base64');
  } catch {
    return false;
  }
}

export async function initializeTelebirrPayment(params: TelebirrInitParams): Promise<TelebirrInitResult> {
  if (!TELEBIRR_APP_ID) {
    // Dev sandbox
    return {
      checkoutUrl: `https://payment.ethiotelecom.et/checkout/mock/${params.txRef}`,
      txRef: params.txRef,
    };
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(16).toString('hex');

  const payload: Record<string, string> = {
    appId: TELEBIRR_APP_ID,
    appKey: TELEBIRR_APP_KEY,
    merchantCode: TELEBIRR_MERCHANT_CODE,
    shortCode: TELEBIRR_SHORT_CODE,
    outTradeNo: params.txRef,
    subject: params.subject,
    totalAmount: params.amount.toFixed(2),
    notifyUrl: params.notifyUrl,
    returnUrl: params.returnUrl,
    receiveName: 'Nile Xport',
    timeoutExpress: '30m',
    timestamp,
    nonce,
  };

  const signStr = buildSignString(payload);
  const sign = rsaSign(signStr, TELEBIRR_PRIVATE_KEY);

  const response = await fetch(TELEBIRR_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, sign }),
  });

  const data = await response.json();

  if (data.code !== '0' && data.code !== 200 && data.code !== '200') {
    throw new Error(data.message || data.msg || 'Telebirr payment initialization failed');
  }

  const checkoutUrl = data.data?.toPayUrl || data.toPayUrl;
  if (!checkoutUrl) throw new Error('Telebirr did not return a checkout URL');

  return { checkoutUrl, txRef: params.txRef };
}
