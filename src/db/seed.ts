import { db } from './index';
import { races, hotels } from './schema';

async function seed() {
  const existing = await db.select().from(races).all();
  if (existing.length > 0) { console.log('Already seeded'); return; }

  await db.insert(races).values([
    {
      id: 'berlin', name: 'Berlin Marathon', city: 'Berlin, Germany', icon: 'berlin',
      date: '27 Sep 2026', month: 9, price_from: '€1,290', terrain: 'Flat & fast',
      status: 'open',
      desc1: 'The Berlin Marathon is the home of world records — flat, fast, and lined with 1 million spectators. Run through the Brandenburg Gate. Cross the line where Eliud Kipchoge made history.',
      desc2: 'Our package puts you at a 4★ hotel within walking distance of the start, with everything pre-arranged so you can focus entirely on race day.',
      photos: JSON.stringify(['Brandenburg Gate at sunrise','Race day on Strasse des 17. Juni','Reichstag finish','Berliner Dom','Hotel Adlon lobby','Race expo','Pasta party','Medal ceremony']),
      included: JSON.stringify(['Race entry & bib','Hotel (3 nights)','Transfers','Welcome dinner','Race day support','Local SIM']),
    },
    {
      id: 'frankfurt', name: 'Frankfurt Marathon', city: 'Frankfurt, Germany', icon: 'frankfurt',
      date: '25 Oct 2026', month: 10, price_from: '€1,190', terrain: 'Flat & fast',
      status: 'open',
      desc1: "Germany's oldest marathon, finishing inside the iconic Festhalle to a roaring crowd and red carpet. Fast, flat, and with one of the most spectacular finishes in world running.",
      desc2: 'Our package includes a 4★ hotel near the start, all transfers, and a One Run team on the ground throughout race weekend.',
      photos: JSON.stringify(['Frankfurt skyline','Main Tower view','Festhalle finish line','Old Town Römer','Race route on the Main','Pasta party','Cheering crowds','Medal moment']),
      included: JSON.stringify(['Race entry & bib','Hotel (3 nights)','Transfers','Welcome dinner','Race day support','Local SIM']),
    },
    {
      id: 'athens', name: 'Athens Classic Marathon', city: 'Athens, Greece', icon: 'athens',
      date: '8 Nov 2026', month: 11, price_from: '€890', terrain: 'Hilly',
      status: 'open',
      desc1: 'The original. Run from Marathon to Athens along the route Pheidippides took in 490 BC, finishing inside the marble Panathenaic Stadium.',
      desc2: 'A bucket-list race for any serious runner. Our package includes accommodation in central Athens, with optional add-ons for Acropolis tours and Aegean island extensions.',
      photos: JSON.stringify(['Acropolis at golden hour','Panathenaic Stadium','Marathon village start','Plaka district','Race expo','Welcome dinner','Hotel rooftop view','Olive ceremony']),
      included: JSON.stringify(['Race entry & bib','Hotel (3 nights)','Transfers','Welcome dinner','Race day support','Local SIM']),
    },
    {
      id: 'valencia', name: 'Valencia Marathon', city: 'Valencia, Spain', icon: 'valencia',
      date: '6 Dec 2026', month: 12, price_from: '€990', terrain: 'Flat & fast',
      status: 'open',
      desc1: "Europe's fastest marathon, set against Valencia's sunshine, futuristic City of Arts & Sciences architecture, and Mediterranean coast.",
      desc2: 'Famous for personal-best conditions and a phenomenal finish line atmosphere. We pair it with a beachside hotel for proper recovery.',
      photos: JSON.stringify(['City of Arts & Sciences','Hemisfèric','Mediterranean coastline','Valencia Old Town','Race start area','Finish line','Paella celebration','Beach recovery']),
      included: JSON.stringify(['Race entry & bib','Hotel (3 nights)','Transfers','Welcome dinner','Race day support','Local SIM']),
    },
    {
      id: 'paris', name: 'Paris Marathon', city: 'Paris, France', icon: 'paris',
      date: '12 Apr 2026', month: 4, price_from: '€1,390', terrain: 'Urban',
      status: 'soldout',
      desc1: 'Start at the Champs-Élysées, finish near the Arc de Triomphe.',
      desc2: "A celebration of running through the world's most beautiful city.",
      photos: JSON.stringify([]),
      included: JSON.stringify(['Race entry & bib','Hotel (3 nights)','Transfers','Welcome dinner','Race day support','Local SIM']),
    },
    {
      id: 'london', name: 'London Marathon', city: 'London, UK', icon: 'london',
      date: '26 Apr 2026', month: 4, price_from: '€1,590', terrain: 'Urban',
      status: 'soldout',
      desc1: 'Six bridges, the Tower of London, Canary Wharf, Buckingham Palace.',
      desc2: 'World Major status. Crowd support is unmatched.',
      photos: JSON.stringify([]),
      included: JSON.stringify(['Race entry & bib','Hotel (3 nights)','Transfers','Welcome dinner','Race day support','Local SIM']),
    },
    {
      id: 'rome', name: 'Rome Marathon', city: 'Rome, Italy', icon: 'rome',
      date: '22 Mar 2026', month: 3, price_from: '€1,090', terrain: 'Hilly',
      status: 'express',
      desc1: 'Run past 2,000 years of history — the Colosseum, Roman Forum, Vatican City, and Trevi Fountain.',
      desc2: 'Cobblestone sections add character. A truly unique marathon experience.',
      photos: JSON.stringify([]),
      included: JSON.stringify(['Race entry & bib','Hotel (3 nights)','Transfers','Welcome dinner','Race day support','Local SIM']),
    },
    {
      id: 'amsterdam', name: 'Amsterdam Marathon', city: 'Amsterdam, Netherlands', icon: 'amsterdam',
      date: '18 Oct 2026', month: 10, price_from: '€1,150', terrain: 'Flat & fast',
      status: 'express',
      desc1: "A flat, fast, autumn marathon through Amsterdam's Vondelpark and finishing in the Olympic Stadium.",
      desc2: 'Stay in a canal-side hotel and turn the trip into a perfect long weekend.',
      photos: JSON.stringify([]),
      included: JSON.stringify(['Race entry & bib','Hotel (3 nights)','Transfers','Welcome dinner','Race day support','Local SIM']),
    },
    {
      id: 'nyc', name: 'New York City Marathon', city: 'New York, USA', icon: 'nyc',
      date: '1 Nov 2026', month: 11, price_from: '€2,890', terrain: 'Hilly',
      status: 'express',
      desc1: 'The biggest marathon in the world. 50,000 runners through all 5 boroughs, finishing in Central Park.',
      desc2: 'A World Major. Our New York package includes Manhattan accommodation and pre-race orientation.',
      photos: JSON.stringify([]),
      included: JSON.stringify(['Race entry & bib','Hotel (3 nights)','Transfers','Welcome dinner','Race day support','Local SIM']),
    },
    {
      id: 'tokyo', name: 'Tokyo Marathon', city: 'Tokyo, Japan', icon: 'tokyo',
      date: '1 Mar 2026', month: 3, price_from: '€2,490', terrain: 'Flat & fast',
      status: 'soldout',
      desc1: 'Run through the Imperial Palace, Asakusa, and Ginza districts.',
      desc2: 'A World Major. Cherry blossom season optional.',
      photos: JSON.stringify([]),
      included: JSON.stringify(['Race entry & bib','Hotel (3 nights)','Transfers','Welcome dinner','Race day support','Local SIM']),
    },
  ]);

  await db.insert(hotels).values([
    { id: 'ber-h1', race_id: 'berlin', name: 'Hotel Adlon Kempinski', area: 'Brandenburg Gate · 5★', stars: 5, features: JSON.stringify(['Steps from the start line','Full breakfast included','Spa & wellness centre','Late checkout race day']), single_price: 1890, twin_price: 3290, total_seats: 20, website: 'https://www.kempinski.com/en/hotel-adlon' },
    { id: 'ber-h2', race_id: 'berlin', name: 'Hotel de Rome', area: 'Mitte · 5★', stars: 5, features: JSON.stringify(['Historic luxury hotel','Rooftop terrace bar','Indoor pool & spa','10 min walk to start']), single_price: 1690, twin_price: 2890, total_seats: 15, website: 'https://www.roccofortehotels.com/hotels-and-resorts/hotel-de-rome/' },
    { id: 'ber-h3', race_id: 'berlin', name: 'Park Inn Alexanderplatz', area: 'Alexanderplatz · 4★', stars: 4, features: JSON.stringify(['Central, modern rooms','Buffet breakfast','Easy U-Bahn access','Excellent value']), single_price: 1290, twin_price: 2290, total_seats: 30, website: 'https://www.radissonhotels.com/en-us/hotels/park-inn-berlin-alexanderplatz' },
    { id: 'fra-h1', race_id: 'frankfurt', name: 'Steigenberger Frankfurter Hof', area: 'Old Town · 5★', stars: 5, features: JSON.stringify(['Iconic luxury hotel','Walking distance to expo','Marathon partner hotel','Spa access included']), single_price: 1690, twin_price: 2890, total_seats: 18, website: 'https://www.hrewards.com/en/steigenberger-frankfurter-hof' },
    { id: 'fra-h2', race_id: 'frankfurt', name: 'NH Collection Frankfurt', area: 'City Centre · 4★', stars: 4, features: JSON.stringify(['Modern, design-focused','Excellent breakfast','5 min to start area','Late checkout race day']), single_price: 1390, twin_price: 2390, total_seats: 25, website: 'https://www.nh-collection.com/en/hotel/nh-collection-frankfurt-city' },
    { id: 'fra-h3', race_id: 'frankfurt', name: 'Hotel Bristol Frankfurt', area: 'Hauptbahnhof · 4★', stars: 4, features: JSON.stringify(['Convenient station location','Buffet breakfast','Pre-race carb dinner','Best value option']), single_price: 1190, twin_price: 2090, total_seats: 30, website: 'https://www.bristol-hotel.de/' },
    { id: 'ath-h1', race_id: 'athens', name: 'Hotel Grande Bretagne', area: 'Syntagma Square · 5★', stars: 5, features: JSON.stringify(['Acropolis-view rooftop','Marathon finish line views','Luxury spa','Greek breakfast included']), single_price: 1490, twin_price: 2590, total_seats: 15, website: 'https://www.grandebretagne.gr/' },
    { id: 'ath-h2', race_id: 'athens', name: 'Electra Metropolis', area: 'Plaka · 5★', stars: 5, features: JSON.stringify(['Boutique luxury','Rooftop pool with Acropolis view','Walking distance to finish','Mediterranean breakfast']), single_price: 1190, twin_price: 1990, total_seats: 12, website: 'https://www.electrahotels.gr/electra-metropolis-hotel-athens/' },
    { id: 'ath-h3', race_id: 'athens', name: 'Athens Tiare Hotel', area: 'Omonia · 4★', stars: 4, features: JSON.stringify(['Central modern hotel','Sky lounge','Buffet breakfast','Excellent value']), single_price: 890, twin_price: 1490, total_seats: 25, website: 'https://www.athenstiarehotel.com/' },
    { id: 'val-h1', race_id: 'valencia', name: 'Hotel Las Arenas Balneario', area: 'Playa Malvarrosa · 5★', stars: 5, features: JSON.stringify(['Beachfront luxury','Spa & wellness','Olympic pool','Mediterranean cuisine']), single_price: 1490, twin_price: 2490, total_seats: 15, website: 'https://www.hotelvalencialasarenas.com/' },
    { id: 'val-h2', race_id: 'valencia', name: 'Caro Hotel', area: 'Old Town · 5★', stars: 5, features: JSON.stringify(['Historic boutique','12 min to start','Restaurant on-site','Quiet courtyard rooms']), single_price: 1290, twin_price: 2190, total_seats: 12, website: 'https://www.carohotel.com/' },
    { id: 'val-h3', race_id: 'valencia', name: 'Vincci Lys', area: 'City Centre · 4★', stars: 4, features: JSON.stringify(['Modern central hotel','Walking distance to start','Buffet breakfast','Great value']), single_price: 990, twin_price: 1790, total_seats: 28, website: 'https://www.vinccihoteles.com/eng/Hotels/Spain/Valencia/Vincci-Lys' },
  ]);

  console.log('Seeded 10 races and 12 hotels');
}

seed().catch(console.error).then(() => process.exit(0));
