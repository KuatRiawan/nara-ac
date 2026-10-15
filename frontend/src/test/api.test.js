import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios before importing api
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
  };
});

import { setCsrfToken, getCsrfToken } from '../api';

describe('CSRF Token management', () => {
  beforeEach(() => {
    setCsrfToken(null);
  });

  it('setCsrfToken stores the token', () => {
    setCsrfToken('test-csrf-token-123');
    expect(getCsrfToken()).toBe('test-csrf-token-123');
  });

  it('setCsrfToken(null) clears the token', () => {
    setCsrfToken('test-csrf-token-123');
    setCsrfToken(null);
    expect(getCsrfToken()).toBeNull();
  });

  it('getCsrfToken returns null when not set', () => {
    expect(getCsrfToken()).toBeNull();
  });
});
