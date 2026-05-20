import { afterEach, describe, expect, it, vi } from 'vitest';
import { directusCreateItem, directusGetItem, directusGetItems, getDirectusConfig } from '../src/lib/directus';

describe('Directus client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('normalizes the Directus base URL and token from env', () => {
    vi.stubEnv('DIRECTUS_URL', 'https://admin.one-run.net/');
    vi.stubEnv('DIRECTUS_TOKEN', 'secret-token');

    expect(getDirectusConfig()).toEqual({
      url: 'https://admin.one-run.net',
      token: 'secret-token',
    });
  });

  it('reads items with query parameters and auth header', async () => {
    vi.stubEnv('DIRECTUS_URL', 'https://admin.one-run.net');
    vi.stubEnv('DIRECTUS_TOKEN', 'secret-token');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'berlin' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(directusGetItems('races', { sort: 'sort', limit: 10 })).resolves.toEqual([{ id: 'berlin' }]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://admin.one-run.net/items/races?sort=sort&limit=10',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer secret-token' }),
      }),
    );
  });

  it('creates items with JSON body', async () => {
    vi.stubEnv('DIRECTUS_URL', 'https://admin.one-run.net');
    vi.stubEnv('DIRECTUS_TOKEN', 'secret-token');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'berlin' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(directusCreateItem('races', { id: 'berlin' })).resolves.toEqual({ id: 'berlin' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://admin.one-run.net/items/races',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ id: 'berlin' }),
      }),
    );
  });

  it('reads one item by id', async () => {
    vi.stubEnv('DIRECTUS_URL', 'https://admin.one-run.net');
    vi.stubEnv('DIRECTUS_TOKEN', 'secret-token');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 12 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(directusGetItem('packages', 12)).resolves.toEqual({ id: 12 });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://admin.one-run.net/items/packages/12',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer secret-token' }) }),
    );
  });
});
