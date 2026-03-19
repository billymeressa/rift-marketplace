import { db } from '../db/client.js';
import { otpCodes } from '../db/schema.js';
import { eq, and, gt } from 'drizzle-orm';

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\s+/g, '');
  if (normalized.startsWith('0')) {
    normalized = '+251' + normalized.slice(1);
  } else if (normalized.startsWith('251') && !normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  return normalized;
}

export function isValidEthiopianPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^\+251[79]\d{8}$/.test(normalized);
}

async function sendViaSandbox(phone: string, code: string): Promise<void> {
  const username = process.env.AT_USERNAME ?? 'sandbox';
  const apiKey = process.env.AT_API_KEY!;
  const from = process.env.AT_SENDER_ID ?? 'Rift';

  const res = await fetch('https://api.sandbox.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'apiKey': apiKey,
    },
    body: new URLSearchParams({
      username,
      to: phone,
      message: `Your Rift verification code is: ${code}`,
      from,
    }).toString(),
  });

  const data = await res.json() as any;
  console.log(`[OTP] AT sandbox response for ${phone}:`, JSON.stringify(data));

  if (!res.ok) throw new Error(`AT sandbox error: ${JSON.stringify(data)}`);
}

export async function createOtp(phone: string): Promise<string> {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await db.insert(otpCodes).values({ phone, code, expiresAt });

  await sendViaSandbox(phone, code);

  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const [otp] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phone, phone),
        eq(otpCodes.code, code),
        eq(otpCodes.verified, false),
        gt(otpCodes.expiresAt, new Date())
      )
    )
    .orderBy(otpCodes.createdAt)
    .limit(1);

  if (!otp) return false;

  await db
    .update(otpCodes)
    .set({ verified: true })
    .where(eq(otpCodes.id, otp.id));

  return true;
}
