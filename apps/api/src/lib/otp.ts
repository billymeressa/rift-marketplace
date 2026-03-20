import crypto from 'crypto';

export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function sendOTP(phone: string, code: string): Promise<void> {
  const message = `Your Nile Xchange code: ${code}. Valid for 10 minutes. Never share this code.`;

  if (process.env.AT_API_KEY && process.env.AT_USERNAME) {
    // Africa's Talking SMS (widely used in Ethiopia, free sandbox)
    try {
      const params = new URLSearchParams({
        username: process.env.AT_USERNAME,
        to: phone,
        message,
      });
      if (process.env.AT_SENDER_ID) params.set('from', process.env.AT_SENDER_ID);

      const res = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          apiKey: process.env.AT_API_KEY,
        },
        body: params.toString(),
      });

      if (!res.ok) console.error('AT SMS error:', await res.text());
      else console.log(`OTP sent via SMS to ${phone}`);
    } catch (err) {
      console.error('AT SMS send failed:', err);
    }
  } else {
    // Development fallback — visible in Render logs
    console.log(`\n=============================`);
    console.log(`OTP for ${phone}: ${code}`);
    console.log(`=============================\n`);
  }
}
