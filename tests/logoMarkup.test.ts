import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('logo markup', () => {
  test('groups one and run together before the subtitle', () => {
    const logo = readFileSync('src/components/Logo.astro', 'utf8');
    const maintenance = readFileSync('src/components/MaintenancePage.astro', 'utf8');

    for (const source of [logo, maintenance]) {
      expect(source).toContain('<span class="logo-wordmark">');
      expect(source).toMatch(
        /<span class="logo-wordmark">\s*<span class="logo-one">one<\/span>\s*<span class="logo-run"[^>]*>run<\/span>\s*<\/span>\s*<span class="logo-sub">travel packages<\/span>/
      );
    }
  });
});
