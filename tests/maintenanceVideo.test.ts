import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('maintenance background video', () => {
  test('uses herovideo2 as the background source', () => {
    const source = readFileSync('src/components/MaintenancePage.astro', 'utf8');

    expect(source).toContain('<source src="/herovideo2.mp4" type="video/mp4" />');
    expect(source).not.toContain('/herovideo1.mp4');
    expect(existsSync('public/herovideo2.mp4')).toBe(true);
  });
});
