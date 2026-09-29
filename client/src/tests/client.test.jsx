import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleResponseError } from '../api/client.js';

describe('handleResponseError', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.location;
    window.location = { assign: vi.fn() };
  });

  it('clears the stored token and redirects to /login on a 401', async () => {
    localStorage.setItem('token', 'stale-token');

    await expect(handleResponseError({ response: { status: 401 } })).rejects.toBeDefined();

    expect(localStorage.getItem('token')).toBeNull();
    expect(window.location.assign).toHaveBeenCalledWith('/login');
  });

  it('leaves the token alone for non-401 errors', async () => {
    localStorage.setItem('token', 'valid-token');

    await expect(handleResponseError({ response: { status: 500 } })).rejects.toBeDefined();

    expect(localStorage.getItem('token')).toBe('valid-token');
  });
});
