import { describe, it, expect } from 'vitest';
import { normalizeWhatsAppNumber, buildWhatsAppUrl } from '../hooks/useBusinessProfile';

describe('normalizeWhatsAppNumber', () => {
  it('converts local 08xx format to 62xx international format', () => {
    expect(normalizeWhatsAppNumber('081234567890')).toBe('6281234567890');
    expect(normalizeWhatsAppNumber('0813-8529-3137')).toBe('6281385293137');
  });

  it('handles numbers already in 62 format', () => {
    expect(normalizeWhatsAppNumber('6281234567890')).toBe('6281234567890');
  });

  it('handles +62 format', () => {
    expect(normalizeWhatsAppNumber('+62 812-3456-7890')).toBe('6281234567890');
  });

  it('handles numbers without leading 0 or 62', () => {
    expect(normalizeWhatsAppNumber('81234567890')).toBe('6281234567890');
  });

  it('returns empty string for empty/null/undefined input', () => {
    expect(normalizeWhatsAppNumber('')).toBe('');
    expect(normalizeWhatsAppNumber(null)).toBe('');
    expect(normalizeWhatsAppNumber(undefined)).toBe('');
  });

  it('strips all non-digit characters', () => {
    expect(normalizeWhatsAppNumber('0812 3456 7890')).toBe('6281234567890');
    expect(normalizeWhatsAppNumber('(0812) 3456-7890')).toBe('6281234567890');
  });
});

describe('buildWhatsAppUrl', () => {
  it('builds a basic wa.me URL without message', () => {
    expect(buildWhatsAppUrl('6281234567890')).toBe('https://wa.me/6281234567890');
  });

  it('builds a wa.me URL with pre-filled message', () => {
    const url = buildWhatsAppUrl('6281234567890', 'Halo, saya mau booking');
    expect(url).toBe('https://wa.me/6281234567890?text=Halo%2C%20saya%20mau%20booking');
  });

  it('encodes special characters in message', () => {
    const url = buildWhatsAppUrl('6281234567890', 'Halo & selamat pagi!');
    expect(url).toContain('Halo%20%26%20selamat%20pagi!');
  });

  it('handles empty message same as no message', () => {
    expect(buildWhatsAppUrl('6281234567890', '')).toBe('https://wa.me/6281234567890');
    expect(buildWhatsAppUrl('6281234567890', null)).toBe('https://wa.me/6281234567890');
  });
});
