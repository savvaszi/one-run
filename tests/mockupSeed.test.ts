import { describe, expect, it } from 'vitest';
import { seedHotels, seedPackages, seedRaces } from '../src/data/mockupSeed';

describe('mockup seed data', () => {
  it('contains the full mockup race list', () => {
    expect(seedRaces.map((race) => race.slug)).toEqual([
      'berlin',
      'frankfurt',
      'athens',
      'valencia',
      'paris',
      'london',
      'rome',
      'amsterdam',
      'nyc',
      'tokyo',
    ]);
  });

  it('creates single and twin packages for every seeded hotel', () => {
    expect(seedHotels.length).toBeGreaterThan(0);
    expect(seedPackages).toHaveLength(seedHotels.length * 2);
    for (const hotel of seedHotels) {
      expect(seedPackages.filter((pkg) => pkg.hotel_slug === hotel.slug).map((pkg) => pkg.type).sort()).toEqual(['single', 'twin']);
    }
  });
});
