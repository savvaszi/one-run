import { describe, expect, it } from 'vitest';
import { createCancellationToken, hashCancellationToken, verifyCancellationToken } from '../src/lib/bookingTokens';

describe('booking cancellation tokens', () => {
  it('verifies a raw token against its stored hash', async () => {
    const rawToken = createCancellationToken();
    const storedHash = await hashCancellationToken(rawToken);

    await expect(verifyCancellationToken(rawToken, storedHash)).resolves.toBe(true);
    await expect(verifyCancellationToken(`${rawToken}x`, storedHash)).resolves.toBe(false);
  });
});
