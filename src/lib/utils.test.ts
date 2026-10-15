import { describe, it, expect } from 'vitest';
import { toKobo, fromKobo, formatNaira, clsx } from '../lib/utils';

describe('Money utilities', () => {
  it('converts naira to kobo correctly', () => {
    expect(toKobo(100)).toBe(10000);
    expect(toKobo(1.50)).toBe(150);
    expect(toKobo(0.01)).toBe(1);
  });

  it('converts kobo to naira correctly', () => {
    expect(fromKobo(10000)).toBe(100);
    expect(fromKobo(150)).toBe(1.5);
    expect(fromKobo(1)).toBe(0.01);
  });

  it('formats naira correctly', () => {
    expect(formatNaira(10000)).toContain('100');
    expect(formatNaira(150)).toContain('1.50');
    expect(formatNaira(0)).toContain('0');
  });

  it('handles floating point precision', () => {
    const amount = 99.99;
    const kobo = toKobo(amount);
    expect(kobo).toBe(9999);
    expect(fromKobo(kobo)).toBe(amount);
  });
});

describe('clsx utility', () => {
  it('combines class names', () => {
    expect(clsx('foo', 'bar')).toBe('foo bar');
  });

  it('filters out falsy values', () => {
    expect(clsx('foo', false, null, undefined, 'bar')).toBe('foo bar');
  });
});
