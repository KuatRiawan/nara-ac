import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ request: vi.fn(), get: vi.fn(), onError: null }));
vi.mock('axios', () => ({ default: {
  isCancel: () => false,
  create: () => ({ request: mock.request, get: mock.get, interceptors: {
    request: { use: vi.fn() }, response: { use: (_ok, onError) => { mock.onError = onError; } },
  } }),
} }));
import { getCsrfToken, setCsrfToken } from '../api';

describe('CSRF session recovery', () => {
  beforeEach(() => { vi.clearAllMocks(); setCsrfToken(null); });
  it('refreshes an expired token and retries the original mutation once', async () => {
    mock.get.mockResolvedValue({ csrfToken: 'fresh-token' });
    mock.request.mockResolvedValue({ ok: true });
    const config = { method: 'patch', url: '/auth/profile', data: { nama: 'Updated' } };
    await expect(mock.onError({ config, response: { status: 403, data: { error: { code: 'CSRF_TOKEN_INVALID' } } } })).resolves.toEqual({ ok: true });
    expect(mock.get).toHaveBeenCalledWith('/auth/csrf-token');
    expect(mock.request).toHaveBeenCalledWith(config);
    expect(getCsrfToken()).toBe('fresh-token');
  });
  it('does not loop when a retried request is rejected again', async () => {
    const data = { error: { code: 'CSRF_TOKEN_INVALID' } };
    await expect(mock.onError({ config: { _csrfRetried: true }, response: { status: 403, data } })).rejects.toEqual(data);
    expect(mock.get).not.toHaveBeenCalled();
    expect(mock.request).not.toHaveBeenCalled();
  });
});
