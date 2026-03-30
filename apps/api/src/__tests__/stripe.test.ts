import { describe, it, expect } from 'vitest';
import { isSupportedByStripe, STRIPE_SUPPORTED_CURRENCIES } from '../lib/stripe.js';

describe('STRIPE_SUPPORTED_CURRENCIES', () => {
  it('includes USD and common international currencies', () => {
    expect(STRIPE_SUPPORTED_CURRENCIES).toContain('usd');
    expect(STRIPE_SUPPORTED_CURRENCIES).toContain('eur');
    expect(STRIPE_SUPPORTED_CURRENCIES).toContain('gbp');
  });

  it('does not include ETB (Ethiopian Birr)', () => {
    expect(STRIPE_SUPPORTED_CURRENCIES).not.toContain('etb');
  });
});

describe('isSupportedByStripe', () => {
  it('returns true for supported currencies (case-insensitive)', () => {
    expect(isSupportedByStripe('usd')).toBe(true);
    expect(isSupportedByStripe('USD')).toBe(true);
    expect(isSupportedByStripe('Usd')).toBe(true);
    expect(isSupportedByStripe('eur')).toBe(true);
    expect(isSupportedByStripe('GBP')).toBe(true);
  });

  it('returns false for unsupported currencies', () => {
    expect(isSupportedByStripe('ETB')).toBe(false);
    expect(isSupportedByStripe('etb')).toBe(false);
    expect(isSupportedByStripe('XYZ')).toBe(false);
    expect(isSupportedByStripe('')).toBe(false);
  });

  it('covers every currency in the supported list', () => {
    for (const currency of STRIPE_SUPPORTED_CURRENCIES) {
      expect(isSupportedByStripe(currency)).toBe(true);
      expect(isSupportedByStripe(currency.toUpperCase())).toBe(true);
    }
  });
});
