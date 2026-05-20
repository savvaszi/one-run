import { directusCreateItem, directusGetItems, directusUpdateItem } from '../src/lib/directus';
import { seedHotels, seedPackages, seedRaces } from '../src/data/mockupSeed';

type ItemWithId = { id: number; slug: string };

async function upsertBySlug<T extends ItemWithId>(collection: string, slug: string, item: Record<string, unknown>): Promise<T> {
  const existing = await directusGetItems<T>(collection, { 'filter[slug][_eq]': slug, limit: 1 });
  if (existing[0]) return directusUpdateItem<T>(collection, existing[0].id, item);
  return directusCreateItem<T>(collection, item);
}

async function seed() {
  const racesBySlug = new Map<string, ItemWithId>();
  const hotelsBySlug = new Map<string, ItemWithId>();

  for (const race of seedRaces) {
    const savedRace = await upsertBySlug<ItemWithId>('races', race.slug, race);
    racesBySlug.set(race.slug, savedRace);
    console.log(`Seeded race ${race.slug}`);
  }

  for (const hotel of seedHotels) {
    const race = racesBySlug.get(hotel.race_slug);
    if (!race) throw new Error(`Missing race ${hotel.race_slug} for hotel ${hotel.slug}`);

    const { race_slug, single_price, twin_price, ...hotelRecord } = hotel;
    const savedHotel = await upsertBySlug<ItemWithId>('hotels', hotel.slug, {
      ...hotelRecord,
      race: race.id,
    });
    hotelsBySlug.set(hotel.slug, savedHotel);
    console.log(`Seeded hotel ${hotel.slug}`);
  }

  for (const pkg of seedPackages) {
    const hotel = hotelsBySlug.get(pkg.hotel_slug);
    if (!hotel) throw new Error(`Missing hotel ${pkg.hotel_slug} for package ${pkg.slug}`);

    const { hotel_slug, ...packageRecord } = pkg;
    await upsertBySlug<ItemWithId>('packages', pkg.slug, {
      ...packageRecord,
      hotel: hotel.id,
    });
    console.log(`Seeded package ${pkg.slug}`);
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
