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

export async function createOtp(phone: string): Promise<string> {
  const bypass = process.env.BYPASS_OTP === 'true';
  const code = bypass ? '123456' : generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await db.insert(otpCodes).values({ phone, code, expiresAt });

  // Always log — visible in Railway logs so you can relay code to testers manually
  console.log(`[OTP] ${phone} → ${code}${bypass ? ' (BYPASS)' : ''}`);

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
