import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function createCancellationToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function hashCancellationToken(rawToken: string): Promise<string> {
  return createHash('sha256').update(rawToken).digest('hex');
}

export async function verifyCancellationToken(rawToken: string, storedHash: string): Promise<boolean> {
  const rawHash = await hashCancellationToken(rawToken);
  const rawBuffer = Buffer.from(rawHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (rawBuffer.length !== storedBuffer.length) return false;
  return timingSafeEqual(rawBuffer, storedBuffer);
}
