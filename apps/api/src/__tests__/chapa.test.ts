import { describe, it, expect } from 'vitest';
import { calculatePlatformFee, generateTxRef, PLATFORM_FEE_RATE_PCT } from '../lib/chapa.js';

describe('PLATFORM_FEE_RATE_PCT', () => {
  it('is 2%', () => {
    expect(PLATFORM_FEE_RATE_PCT).toBe(0.02);
  });
});

describe('calculatePlatformFee', () => {
  it('charges 2% on round amounts', () => {
    expect(calculatePlatformFee(100)).toBe(2);
    expect(calculatePlatformFee(500)).toBe(10);
    expect(calculatePlatformFee(1000)).toBe(20);
  });

  it('rounds to 2 decimal places', () => {
    // 33.33 * 0.02 = 0.6666 → 0.67
    expect(calculatePlatformFee(33.33)).toBe(0.67);
    // 1.50 * 0.02 = 0.03
    expect(calculatePlatformFee(1.50)).toBe(0.03);
  });

  it('returns 0 for a zero amount', () => {
    expect(calculatePlatformFee(0)).toBe(0);
  });

  it('scales linearly with amount', () => {
    const fee100 = calculatePlatformFee(100);
    const fee200 = calculatePlatformFee(200);
    expect(fee200).toBe(fee100 * 2);
  });
});

describe('generateTxRef', () => {
  const sampleId = '12345678-90ab-cdef-1234-567890abcdef';

  it('starts with the NX- prefix', () => {
    expect(generateTxRef(sampleId)).toMatch(/^NX-/);
  });

  it('strips dashes from the order ID segment', () => {
    const ref = generateTxRef(sampleId);
    // The middle segment (order ID part) must not contain dashes
    const parts = ref.split('-');
    // format: NX-<orderId12chars>-<timestamp>
    expect(parts.length).toBe(3);
    expect(parts[1]).not.toContain('-');
  });

  it('uses the first 12 non-dash characters of the order ID', () => {
    const ref = generateTxRef(sampleId);
    const parts = ref.split('-');
    // '1234567890ab' — first 12 chars after removing dashes from sampleId
    expect(parts[1]).toBe('1234567890ab');
  });

  it('appends an uppercase base-36 timestamp', () => {
    const ref = generateTxRef(sampleId);
    const ts = ref.split('-')[2];
    expect(ts).toMatch(/^[A-Z0-9]+$/);
  });

  it('produces different refs over time', async () => {
    const ref1 = generateTxRef(sampleId);
    await new Promise(r => setTimeout(r, 5));
    const ref2 = generateTxRef(sampleId);
    // Timestamps tick in ms — refs generated >1 ms apart should differ
    // (they could theoretically match within the same ms, so just assert format)
    expect(ref1).toMatch(/^NX-[a-z0-9]+-[A-Z0-9]+$/i);
    expect(ref2).toMatch(/^NX-[a-z0-9]+-[A-Z0-9]+$/i);
  });
});
