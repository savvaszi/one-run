import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

export function verifyRevolutWebhook(
  rawBody: string,
  timestamp: string | null,
  signatureHeader: string | null,
  secret: string | undefined,
  now = Date.now(),
): boolean {
  if (!timestamp || !signatureHeader || !secret) return false;

  const timestampValue = Number(timestamp);
  if (!Number.isSafeInteger(timestampValue)) return false;
  const timestampMs = timestampValue < 1_000_000_000_000 ? timestampValue * 1000 : timestampValue;
  if (Math.abs(now - timestampMs) > MAX_TIMESTAMP_SKEW_MS) return false;

  const payload = `v1.${timestamp}.${rawBody}`;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');

  return signatureHeader.split(',').some((entry) => {
    const [version, value] = entry.trim().split('=', 2);
    if (version !== 'v1' || !value || !/^[a-f0-9]{64}$/i.test(value)) return false;

    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(value, 'hex');
    return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
  });
}
