export interface SeedRace {
  slug: string;
  name: string;
  city: string;
  icon: string;
  date: string;
  month: number;
  price_from: string;
  terrain: string;
  status: 'open' | 'soldout' | 'express';
  desc1: string;
  desc2: string;
  photos: string[];
  included: string[];
  sort: number;
}

export interface SeedHotel {
  slug: string;
  race_slug: string;
  name: string;
  area: string;
  stars: number;
  features: string[];
  website: string;
  sort: number;
  single_price: number;
  twin_price: number;
}

export interface SeedPackage {
  slug: string;
  hotel_slug: string;
  type: 'single' | 'twin';
  label: string;
  runner_count: number;
  price: number;
  currency: 'EUR';
  total_seats: number;
  booked_seats: number;
  active: boolean;
}

const included = ['Race entry & bib', 'Hotel (3 nights)', 'Transfers', 'Welcome dinner', 'Race day support', 'Local SIM'];

export const seedRaces: SeedRace[] = [
  {
    slug: 'berlin', name: 'Berlin Marathon', city: 'Berlin, Germany', icon: 'berlin', date: '27 Sep 2026', month: 9, price_from: '€1,290', terrain: 'Flat & fast', status: 'open', sort: 1,
    desc1: 'The Berlin Marathon is the home of world records — flat, fast, and lined with 1 million spectators. Run through the Brandenburg Gate. Cross the line where Eliud Kipchoge made history.',
    desc2: 'Our package puts you at a 4★ hotel within walking distance of the start, with everything pre-arranged so you can focus entirely on race day.',
    photos: ['Brandenburg Gate at sunrise', 'Race day on Strasse des 17. Juni', 'Reichstag finish', 'Berliner Dom', 'Hotel Adlon lobby', 'Race expo', 'Pasta party', 'Medal ceremony'], included,
  },
  {
    slug: 'frankfurt', name: 'Frankfurt Marathon', city: 'Frankfurt, Germany', icon: 'frankfurt', date: '25 Oct 2026', month: 10, price_from: '€1,190', terrain: 'Flat & fast', status: 'open', sort: 2,
    desc1: "Germany's oldest marathon, finishing inside the iconic Festhalle to a roaring crowd and red carpet. Fast, flat, and with one of the most spectacular finishes in world running.",
    desc2: 'Our package includes a 4★ hotel near the start, all transfers, and a One Run team on the ground throughout race weekend.',
    photos: ['Frankfurt skyline', 'Main Tower view', 'Festhalle finish line', 'Old Town Römer', 'Race route on the Main', 'Pasta party', 'Cheering crowds', 'Medal moment'], included,
  },
  {
    slug: 'athens', name: 'Athens Classic Marathon', city: 'Athens, Greece', icon: 'athens', date: '8 Nov 2026', month: 11, price_from: '€890', terrain: 'Hilly', status: 'open', sort: 3,
    desc1: 'The original. Run from Marathon to Athens along the route Pheidippides took in 490 BC, finishing inside the marble Panathenaic Stadium.',
    desc2: 'A bucket-list race for any serious runner. Our package includes accommodation in central Athens, with optional add-ons for Acropolis tours and Aegean island extensions.',
    photos: ['Acropolis at golden hour', 'Panathenaic Stadium', 'Marathon village start', 'Plaka district', 'Race expo', 'Welcome dinner', 'Hotel rooftop view', 'Olive ceremony'], included,
  },
  {
    slug: 'valencia', name: 'Valencia Marathon', city: 'Valencia, Spain', icon: 'valencia', date: '6 Dec 2026', month: 12, price_from: '€990', terrain: 'Flat & fast', status: 'open', sort: 4,
    desc1: "Europe's fastest marathon, set against Valencia's sunshine, futuristic City of Arts & Sciences architecture, and Mediterranean coast.",
    desc2: 'Famous for personal-best conditions and a phenomenal finish line atmosphere. We pair it with a beachside hotel for proper recovery.',
    photos: ['City of Arts & Sciences', 'Hemisfèric', 'Mediterranean coastline', 'Valencia Old Town', 'Race start area', 'Finish line', 'Paella celebration', 'Beach recovery'], included,
  },
  { slug: 'paris', name: 'Paris Marathon', city: 'Paris, France', icon: 'paris', date: '12 Apr 2026', month: 4, price_from: '€1,390', terrain: 'Urban', status: 'soldout', sort: 5, desc1: 'Start at the Champs-Élysées, finish near the Arc de Triomphe.', desc2: "A celebration of running through the world's most beautiful city.", photos: [], included },
  { slug: 'london', name: 'London Marathon', city: 'London, UK', icon: 'london', date: '26 Apr 2026', month: 4, price_from: '€1,590', terrain: 'Urban', status: 'soldout', sort: 6, desc1: 'Six bridges, the Tower of London, Canary Wharf, Buckingham Palace.', desc2: 'World Major status. Crowd support is unmatched.', photos: [], included },
  { slug: 'rome', name: 'Rome Marathon', city: 'Rome, Italy', icon: 'rome', date: '22 Mar 2026', month: 3, price_from: '€1,090', terrain: 'Hilly', status: 'express', sort: 7, desc1: 'Run past 2,000 years of history — the Colosseum, Roman Forum, Vatican City, and Trevi Fountain.', desc2: 'Cobblestone sections add character. A truly unique marathon experience.', photos: [], included },
  { slug: 'amsterdam', name: 'Amsterdam Marathon', city: 'Amsterdam, Netherlands', icon: 'amsterdam', date: '18 Oct 2026', month: 10, price_from: '€1,150', terrain: 'Flat & fast', status: 'express', sort: 8, desc1: "A flat, fast, autumn marathon through Amsterdam's Vondelpark and finishing in the Olympic Stadium.", desc2: 'Stay in a canal-side hotel and turn the trip into a perfect long weekend.', photos: [], included },
  { slug: 'nyc', name: 'New York City Marathon', city: 'New York, USA', icon: 'nyc', date: '1 Nov 2026', month: 11, price_from: '€2,890', terrain: 'Hilly', status: 'express', sort: 9, desc1: 'The biggest marathon in the world. 50,000 runners through all 5 boroughs, finishing in Central Park.', desc2: 'A World Major. Our New York package includes Manhattan accommodation and pre-race orientation.', photos: [], included },
  { slug: 'tokyo', name: 'Tokyo Marathon', city: 'Tokyo, Japan', icon: 'tokyo', date: '1 Mar 2026', month: 3, price_from: '€2,490', terrain: 'Flat & fast', status: 'soldout', sort: 10, desc1: 'Run through the Imperial Palace, Asakusa, and Ginza districts.', desc2: 'A World Major. Cherry blossom season optional.', photos: [], included },
];

export const seedHotels: SeedHotel[] = [
  { slug: 'berlin-adlon', race_slug: 'berlin', name: 'Hotel Adlon Kempinski', area: 'Brandenburg Gate · 5★', stars: 5, features: ['Steps from the start line', 'Full breakfast included', 'Spa & wellness centre', 'Late checkout race day'], single_price: 1890, twin_price: 3290, website: 'https://www.kempinski.com/en/hotel-adlon', sort: 1 },
  { slug: 'berlin-de-rome', race_slug: 'berlin', name: 'Hotel de Rome', area: 'Mitte · 5★', stars: 5, features: ['Historic luxury hotel', 'Rooftop terrace bar', 'Indoor pool & spa', '10 min walk to start'], single_price: 1690, twin_price: 2890, website: 'https://www.roccofortehotels.com/hotels-and-resorts/hotel-de-rome/', sort: 2 },
  { slug: 'berlin-park-inn', race_slug: 'berlin', name: 'Park Inn Alexanderplatz', area: 'Alexanderplatz · 4★', stars: 4, features: ['Central, modern rooms', 'Buffet breakfast', 'Easy U-Bahn access', 'Excellent value'], single_price: 1290, twin_price: 2290, website: 'https://www.radissonhotels.com/en-us/hotels/park-inn-berlin-alexanderplatz', sort: 3 },
  { slug: 'frankfurt-steigenberger', race_slug: 'frankfurt', name: 'Steigenberger Frankfurter Hof', area: 'Old Town · 5★', stars: 5, features: ['Iconic luxury hotel', 'Walking distance to expo', 'Marathon partner hotel', 'Spa access included'], single_price: 1690, twin_price: 2890, website: 'https://www.hrewards.com/en/steigenberger-frankfurter-hof', sort: 1 },
  { slug: 'frankfurt-nh-collection', race_slug: 'frankfurt', name: 'NH Collection Frankfurt', area: 'City Centre · 4★', stars: 4, features: ['Modern, design-focused', 'Excellent breakfast', '5 min to start area', 'Late checkout race day'], single_price: 1390, twin_price: 2390, website: 'https://www.nh-collection.com/en/hotel/nh-collection-frankfurt-city', sort: 2 },
  { slug: 'frankfurt-bristol', race_slug: 'frankfurt', name: 'Hotel Bristol Frankfurt', area: 'Hauptbahnhof · 4★', stars: 4, features: ['Convenient station location', 'Buffet breakfast', 'Pre-race carb dinner', 'Best value option'], single_price: 1190, twin_price: 2090, website: 'https://www.bristol-hotel.de/', sort: 3 },
  { slug: 'athens-grande-bretagne', race_slug: 'athens', name: 'Hotel Grande Bretagne', area: 'Syntagma Square · 5★', stars: 5, features: ['Acropolis-view rooftop', 'Marathon finish line views', 'Luxury spa', 'Greek breakfast included'], single_price: 1490, twin_price: 2590, website: 'https://www.grandebretagne.gr/', sort: 1 },
  { slug: 'athens-electra-metropolis', race_slug: 'athens', name: 'Electra Metropolis', area: 'Plaka · 5★', stars: 5, features: ['Boutique luxury', 'Rooftop pool with Acropolis view', 'Walking distance to finish', 'Mediterranean breakfast'], single_price: 1190, twin_price: 1990, website: 'https://www.electrahotels.gr/electra-metropolis-hotel-athens/', sort: 2 },
  { slug: 'athens-tiare', race_slug: 'athens', name: 'Athens Tiare Hotel', area: 'Omonia · 4★', stars: 4, features: ['Central modern hotel', 'Sky lounge', 'Buffet breakfast', 'Excellent value'], single_price: 890, twin_price: 1490, website: 'https://www.athenstiarehotel.com/', sort: 3 },
  { slug: 'valencia-las-arenas', race_slug: 'valencia', name: 'Hotel Las Arenas Balneario', area: 'Playa Malvarrosa · 5★', stars: 5, features: ['Beachfront luxury', 'Spa & wellness', 'Olympic pool', 'Mediterranean cuisine'], single_price: 1490, twin_price: 2490, website: 'https://www.hotelvalencialasarenas.com/', sort: 1 },
  { slug: 'valencia-caro', race_slug: 'valencia', name: 'Caro Hotel', area: 'Old Town · 5★', stars: 5, features: ['Historic boutique', '12 min to start', 'Restaurant on-site', 'Quiet courtyard rooms'], single_price: 1290, twin_price: 2190, website: 'https://www.carohotel.com/', sort: 2 },
  { slug: 'valencia-vincci-lys', race_slug: 'valencia', name: 'Vincci Lys', area: 'City Centre · 4★', stars: 4, features: ['Modern central hotel', 'Walking distance to start', 'Buffet breakfast', 'Great value'], single_price: 990, twin_price: 1790, website: 'https://www.vinccihoteles.com/eng/Hotels/Spain/Valencia/Vincci-Lys', sort: 3 },
];

export const seedPackages: SeedPackage[] = seedHotels.flatMap((hotel) => [
  { slug: `${hotel.slug}-single`, hotel_slug: hotel.slug, type: 'single', label: 'Single Room & 1 Race Entry', runner_count: 1, price: hotel.single_price, currency: 'EUR', total_seats: 50, booked_seats: 0, active: true },
  { slug: `${hotel.slug}-twin`, hotel_slug: hotel.slug, type: 'twin', label: 'Twin / Double Room & 2 Race Entries', runner_count: 2, price: hotel.twin_price, currency: 'EUR', total_seats: 50, booked_seats: 0, active: true },
]);
