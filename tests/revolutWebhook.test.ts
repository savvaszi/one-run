import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyRevolutWebhook } from '../src/lib/revolutWebhook';

describe('Revolut webhook verification', () => {
  const now = 1_750_000_000_000;
  const timestamp = String(now);
  const body = '{"event":"ORDER_COMPLETED","order_id":"order-1"}';
  const secret = 'test-webhook-secret';

  function signatureFor(payload: string): string {
    const signed = `v1.${timestamp}.${payload}`;
    return `v1=${createHmac('sha256', secret).update(signed).digest('hex')}`;
  }

  it('accepts a valid, recent signature', () => {
    expect(verifyRevolutWebhook(body, timestamp, signatureFor(body), secret, now)).toBe(true);
  });

  it('rejects a tampered body and stale timestamp', () => {
    expect(verifyRevolutWebhook('{"event":"ORDER_COMPLETED"}', timestamp, signatureFor(body), secret, now)).toBe(false);
    expect(verifyRevolutWebhook(body, timestamp, signatureFor(body), secret, now + 6 * 60 * 1000)).toBe(false);
  });
});
