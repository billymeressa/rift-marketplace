import { describe, it, expect } from 'vitest';
import { verifyTelebirrSignature } from '../lib/telebirr.js';

describe('verifyTelebirrSignature', () => {
  it('returns true when no public key is configured (dev mode)', () => {
    // TELEBIRR_PUBLIC_KEY is not set in the test environment
    const params = { outTradeNo: 'NX-abc123-XYZ', status: 'success', amount: '100.00' };
    expect(verifyTelebirrSignature(params, 'any-signature')).toBe(true);
  });

  it('returns true for empty params in dev mode', () => {
    expect(verifyTelebirrSignature({}, '')).toBe(true);
  });
});
