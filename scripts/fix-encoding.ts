import { directusGetItems, directusUpdateItem } from '../src/lib/directus';

const raceUpdates: Record<number, Record<string, string>> = {
  1: {
    price_from: '\u20AC1,290',
    desc1: 'The Berlin Marathon is the home of world records \u2014 flat, fast, and lined with 1 million spectators. Run through the Brandenburg Gate. Cross the line where Eliud Kipchoge made history.',
    desc2: 'Our package puts you at a 4\u2605 hotel within walking distance of the start, with everything pre-arranged so you can focus entirely on race day.',
  },
  2: {
    price_from: '\u20AC1,190',
    desc1: "Germany's oldest marathon, finishing inside the iconic Festhalle to a roaring crowd and red carpet. Fast, flat, and with one of the most spectacular finishes in world running.",
    desc2: 'Our package includes a 4\u2605 hotel near the start, all transfers, and a One Run team on the ground throughout race weekend.',
  },
  3: {
    price_from: '\u20AC890',
  },
  4: {
    price_from: '\u20AC990',
  },
  5: {
    price_from: '\u20AC1,390',
    desc1: 'Start at the Champs-\u00C9lys\u00E9es, finish near the Arc de Triomphe.',
  },
  6: { price_from: '\u20AC1,590' },
  7: { price_from: '\u20AC1,090' },
  8: { price_from: '\u20AC1,150' },
  9: { price_from: '\u20AC2,890' },
  10: { price_from: '\u20AC2,490' },
};

const hotelUpdates: Record<number, Record<string, string>> = {
  1: { area: 'Brandenburg Gate \u00B7 5\u2605' },
  2: { area: 'Mitte \u00B7 5\u2605' },
  3: { area: 'Alexanderplatz \u00B7 4\u2605' },
  4: { area: 'Old Town \u00B7 5\u2605' },
  5: { area: 'City Centre \u00B7 4\u2605' },
  6: { area: 'Hauptbahnhof \u00B7 4\u2605' },
  7: { area: 'Syntagma Square \u00B7 5\u2605' },
  8: { area: 'Plaka \u00B7 5\u2605' },
  9: { area: 'Omonia \u00B7 4\u2605' },
  10: { area: 'Playa Malvarrosa \u00B7 5\u2605' },
  11: { area: 'Old Town \u00B7 5\u2605' },
  12: { area: 'City Centre \u00B7 4\u2605' },
};

async function fix() {
  console.log('Fixing races...');
  for (const [id, data] of Object.entries(raceUpdates)) {
    await directusUpdateItem('races', Number(id), data);
    console.log(`  Race ${id} updated`);
  }

  console.log('Fixing hotels...');
  for (const [id, data] of Object.entries(hotelUpdates)) {
    await directusUpdateItem('hotels', Number(id), data);
    console.log(`  Hotel ${id} updated`);
  }

  console.log('Done!');
}

fix().catch((e) => { console.error(e); process.exit(1); });
