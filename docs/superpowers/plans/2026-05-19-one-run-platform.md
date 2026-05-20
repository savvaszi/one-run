# One Run Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full One Run marathon travel booking platform — an Astro hybrid (SSG + SSR) monolith with SQLite, Revolut payments, Resend emails, and an admin panel, deployed on Dokploy.

**Architecture:** Astro monolith with `output: 'hybrid'` via `@astrojs/node`. Static marketing pages pre-built at build time; booking, payment, and admin routes rendered on-demand. SQLite via Drizzle ORM. Single Docker container + persistent volume.

**Tech Stack:** Astro, Drizzle ORM, libsql (SQLite), Revolut Merchant API, Resend, vanilla JS/CSS (from existing `index.html`).

---

## File Map

```
one-run/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── Dockerfile
├── data/                        # Volume-mounted at deploy
│   └── onerun.db               # SQLite database file
├── src/
│   ├── env.d.ts
│   ├── pages/
│   │   ├── index.astro          # SSG — homepage
│   │   ├── races/[id].astro     # SSG — race detail
│   │   ├── terms.astro          # SSG
│   │   ├── privacy.astro        # SSG
│   │   ├── cancellation.astro   # SSG
│   │   ├── contact.astro        # SSG
│   │   ├── how-it-works.astro   # SSG
│   │   ├── booking.astro        # SSR — runner form + payment
│   │   ├── confirm/[ref].astro  # SSR — post-payment confirmation
│   │   └── admin/
│   │       ├── login.astro      # SSR — admin login
│   │       ├── index.astro      # SSR — dashboard
│   │       ├── races.astro      # SSR — race list
│   │       ├── races/[id].astro # SSR — edit race + hotels
│   │       └── settings.astro   # SSR — API keys, password
│   ├── pages/api/
│   │   ├── interest.ts          # POST
│   │   ├── contact.ts           # POST
│   │   ├── book.ts              # POST
│   │   ├── payment/
│   │   │   ├── create.ts        # POST
│   │   │   ├── webhook.ts       # POST
│   │   │   └── confirm/[ref].ts # GET
│   │   └── admin/
│   │       ├── auth.ts          # POST
│   │       ├── races.ts         # GET + POST
│   │       ├── races/[id].ts    # PUT + DELETE
│   │       ├── hotels.ts        # POST
│   │       ├── hotels/[id].ts   # PUT + DELETE
│   │       ├── settings.ts      # GET + PUT
│   │       ├── bookings.ts      # GET
│   │       ├── bookings/[id]/cancel.ts  # POST
│   │       └── upload.ts        # POST
│   ├── layouts/
│   │   └── Base.astro           # Shared HTML shell
│   ├── components/
│   │   ├── Nav.astro
│   │   ├── Hero.astro
│   │   ├── RaceCard.astro
│   │   ├── RaceGrid.astro
│   │   ├── Logo.astro
│   │   ├── HotelCard.astro
│   │   ├── HotelCardCompact.astro
│   │   ├── RunnerForm.astro
│   │   ├── ProgressBar.astro
│   │   ├── StatusPill.astro
│   │   ├── InterestModal.astro
│   │   ├── Footer.astro
│   │   ├── ContactForm.astro
│   │   └── AdminNav.astro
│   ├── db/
│   │   ├── schema.ts            # Drizzle table definitions
│   │   ├── index.ts             # Database client singleton
│   │   └── seed.ts              # Initial race + hotel data
│   ├── lib/
│   │   ├── revolut.ts           # Revolut API wrapper
│   │   ├── resend.ts            # Resend email wrapper
│   │   ├── auth.ts              # Admin auth (session cookie)
│   │   └── settings.ts          # Settings read from DB
│   └── data/
│       └── uploads/             # gitignore'd, volume-mounted
├── public/
│   ├── runner-hero.jpg
│   ├── One Run Logo Dark.png
│   └── One Run Logo Light.png
└── styles/
    └── global.css               # Extracted from index.html
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `drizzle.config.ts`, `src/env.d.ts`, `.gitignore`

- [ ] **Step 1: Initialize the project**

```bash
npm create astro@latest . -- --template minimal --skip-houston --typescript strict
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @astrojs/node drizzle-orm @libsql/client resend
npm install -D drizzle-kit @types/node
```

- [ ] **Step 3: Write `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'hybrid',
  adapter: node({ mode: 'standalone' }),
  server: { port: 4321 },
  vite: {
    ssr: { noExternal: ['@libsql/client'] }
  }
});
```

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

- [ ] **Step 5: Write `drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: { url: './data/onerun.db' }
});
```

- [ ] **Step 6: Write `src/env.d.ts`**

```ts
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    isAdmin: boolean;
  }
}
```

- [ ] **Step 7: Write `.gitignore`**

```
node_modules/
dist/
data/onerun.db
drizzle/
src/data/uploads/
.env
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "scaffold: init Astro hybrid project with dependencies"
```

---

### Task 2: Database Schema & Client

**Files:**
- Create: `src/db/schema.ts`, `src/db/index.ts`, `src/db/seed.ts`

- [ ] **Step 1: Write `src/db/schema.ts`**

```ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const races = sqliteTable('races', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  icon: text('icon').notNull(),
  date: text('date').notNull(),
  month: integer('month').notNull(),
  price_from: text('price_from').notNull(),
  terrain: text('terrain').notNull(),
  status: text('status', { enum: ['open', 'soldout', 'express'] }).notNull(),
  desc1: text('desc1').notNull(),
  desc2: text('desc2').notNull(),
  photos: text('photos').notNull(),   // JSON array
  included: text('included').notNull(), // JSON array
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

export const hotels = sqliteTable('hotels', {
  id: text('id').primaryKey(),
  race_id: text('race_id').notNull().references(() => races.id),
  name: text('name').notNull(),
  area: text('area').notNull(),
  stars: integer('stars').notNull(),
  features: text('features').notNull(), // JSON array
  single_price: integer('single_price').notNull(),
  twin_price: integer('twin_price').notNull(),
  total_seats: integer('total_seats').notNull().default(50),
  booked_seats: integer('booked_seats').notNull().default(0),
  website: text('website').notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(),
  race_id: text('race_id').notNull().references(() => races.id),
  hotel_id: text('hotel_id').notNull().references(() => hotels.id),
  package_type: text('package_type', { enum: ['single', 'twin'] }).notNull(),
  total_amount: integer('total_amount').notNull(),
  currency: text('currency').notNull().default('EUR'),
  revolut_order_id: text('revolut_order_id'),
  status: text('status', { enum: ['pending', 'paid', 'cancelled'] }).notNull().default('pending'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

export const runners = sqliteTable('runners', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  booking_id: text('booking_id').notNull().references(() => bookings.id),
  full_name: text('full_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  nationality: text('nationality').notNull(),
  passport_id: text('passport_id').notNull(),
  expected_time: text('expected_time').notNull(),
  certificate: text('certificate'),
  requirements: text('requirements'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

export const interestRegistrations = sqliteTable('interest_registrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  race_name: text('race_name').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});
```

- [ ] **Step 2: Write `src/db/index.ts`**

```ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const client = createClient({ url: 'file:data/onerun.db' });
export const db = drizzle(client, { schema });

export { schema };
```

- [ ] **Step 3: Push schema to SQLite**

```bash
npx drizzle-kit push
```

Expected: Creates `data/onerun.db` with all tables.

- [ ] **Step 4: Write `src/db/seed.ts` — seed races and hotels from old `index.html` data**

```ts
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
    // Berlin hotels
    { id: 'ber-h1', race_id: 'berlin', name: 'Hotel Adlon Kempinski', area: 'Brandenburg Gate · 5★', stars: 5, features: JSON.stringify(['Steps from the start line','Full breakfast included','Spa & wellness centre','Late checkout race day']), single_price: 1890, twin_price: 3290, total_seats: 20, website: 'https://www.kempinski.com/en/hotel-adlon' },
    { id: 'ber-h2', race_id: 'berlin', name: 'Hotel de Rome', area: 'Mitte · 5★', stars: 5, features: JSON.stringify(['Historic luxury hotel','Rooftop terrace bar','Indoor pool & spa','10 min walk to start']), single_price: 1690, twin_price: 2890, total_seats: 15, website: 'https://www.roccofortehotels.com/hotels-and-resorts/hotel-de-rome/' },
    { id: 'ber-h3', race_id: 'berlin', name: 'Park Inn Alexanderplatz', area: 'Alexanderplatz · 4★', stars: 4, features: JSON.stringify(['Central, modern rooms','Buffet breakfast','Easy U-Bahn access','Excellent value']), single_price: 1290, twin_price: 2290, total_seats: 30, website: 'https://www.radissonhotels.com/en-us/hotels/park-inn-berlin-alexanderplatz' },
    // Frankfurt hotels
    { id: 'fra-h1', race_id: 'frankfurt', name: 'Steigenberger Frankfurter Hof', area: 'Old Town · 5★', stars: 5, features: JSON.stringify(['Iconic luxury hotel','Walking distance to expo','Marathon partner hotel','Spa access included']), single_price: 1690, twin_price: 2890, total_seats: 18, website: 'https://www.hrewards.com/en/steigenberger-frankfurter-hof' },
    { id: 'fra-h2', race_id: 'frankfurt', name: 'NH Collection Frankfurt', area: 'City Centre · 4★', stars: 4, features: JSON.stringify(['Modern, design-focused','Excellent breakfast','5 min to start area','Late checkout race day']), single_price: 1390, twin_price: 2390, total_seats: 25, website: 'https://www.nh-collection.com/en/hotel/nh-collection-frankfurt-city' },
    { id: 'fra-h3', race_id: 'frankfurt', name: 'Hotel Bristol Frankfurt', area: 'Hauptbahnhof · 4★', stars: 4, features: JSON.stringify(['Convenient station location','Buffet breakfast','Pre-race carb dinner','Best value option']), single_price: 1190, twin_price: 2090, total_seats: 30, website: 'https://www.bristol-hotel.de/' },
    // Athens hotels
    { id: 'ath-h1', race_id: 'athens', name: 'Hotel Grande Bretagne', area: 'Syntagma Square · 5★', stars: 5, features: JSON.stringify(['Acropolis-view rooftop','Marathon finish line views','Luxury spa','Greek breakfast included']), single_price: 1490, twin_price: 2590, total_seats: 15, website: 'https://www.grandebretagne.gr/' },
    { id: 'ath-h2', race_id: 'athens', name: 'Electra Metropolis', area: 'Plaka · 5★', stars: 5, features: JSON.stringify(['Boutique luxury','Rooftop pool with Acropolis view','Walking distance to finish','Mediterranean breakfast']), single_price: 1190, twin_price: 1990, total_seats: 12, website: 'https://www.electrahotels.gr/electra-metropolis-hotel-athens/' },
    { id: 'ath-h3', race_id: 'athens', name: 'Athens Tiare Hotel', area: 'Omonia · 4★', stars: 4, features: JSON.stringify(['Central modern hotel','Sky lounge','Buffet breakfast','Excellent value']), single_price: 890, twin_price: 1490, total_seats: 25, website: 'https://www.athenstiarehotel.com/' },
    // Valencia hotels
    { id: 'val-h1', race_id: 'valencia', name: 'Hotel Las Arenas Balneario', area: 'Playa Malvarrosa · 5★', stars: 5, features: JSON.stringify(['Beachfront luxury','Spa & wellness','Olympic pool','Mediterranean cuisine']), single_price: 1490, twin_price: 2490, total_seats: 15, website: 'https://www.hotelvalencialasarenas.com/' },
    { id: 'val-h2', race_id: 'valencia', name: 'Caro Hotel', area: 'Old Town · 5★', stars: 5, features: JSON.stringify(['Historic boutique','12 min to start','Restaurant on-site','Quiet courtyard rooms']), single_price: 1290, twin_price: 2190, total_seats: 12, website: 'https://www.carohotel.com/' },
    { id: 'val-h3', race_id: 'valencia', name: 'Vincci Lys', area: 'City Centre · 4★', stars: 4, features: JSON.stringify(['Modern central hotel','Walking distance to start','Buffet breakfast','Great value']), single_price: 990, twin_price: 1790, total_seats: 28, website: 'https://www.vinccihoteles.com/eng/Hotels/Spain/Valencia/Vincci-Lys' },
  ]);

  console.log('Seeded 10 races and 12 hotels');
}

seed().catch(console.error).then(() => process.exit(0));
```

- [ ] **Step 5: Run seed**

```bash
npx tsx src/db/seed.ts
```

Expected: "Seeded 10 races and 12 hotels"

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add database schema, client, and seed data"
```

---

### Task 3: Global CSS (extracted from index.html)

**Files:**
- Create: `styles/global.css`

- [ ] **Step 1: Write `styles/global.css`**

Copy ALL CSS from `index.html` lines 8-299 (between `<style>` and `</style>`) into `styles/global.css`. Remove stale CSS rules that are NOT used in the compact checkout flow:

Remove these selectors (old full-page detail layout):
- `.detail-hero` block (line 135-142)
- `.detail-photos` block (line 143-146)
- `.detail-body` block (line 147-155)
- `.detail-packages` block (line 156-166)
- `.package-tabs`, `.pkg-tab*` blocks (line 159-165)
- `.hotel-intro` (line 166)
- `.hotels-grid` (line 167)
- `.hotel-card` (line 168-171)
- `.hotel-photo`, `.hotel-stars` (line 172-174)
- `.hotel-body`, `.hotel-name`, `.hotel-area`, `.hotel-features`, `.hotel-price-row`, `.hotel-price`, `.hotel-price-l` (lines 175-183)
- `.package-grid`, `.package-card`, `.pkg-tag`, `.pkg-name`, `.pkg-desc`, `.pkg-features`, `.pkg-price-row`, `.pkg-price`, `.pkg-price-l` (lines 184-196)
- `.continue-bar` (line 197-201)

Keep all other CSS including:
- Variables, reset, nav, hero, race cards, filters, compact detail view, booking page, confirmation page, modal, footer, responsive media queries.

- [ ] **Step 2: Commit**

```bash
git add styles/global.css
git commit -m "feat: extract global CSS from index.html, remove unused rules"
```

---

### Task 4: Shared Layout & Components

**Files:**
- Create: `src/layouts/Base.astro`
- Create: `src/components/Logo.astro`, `Nav.astro`, `Footer.astro`, `StatusPill.astro`

- [ ] **Step 1: Write `src/layouts/Base.astro`**

```astro
---
interface Props { title: string; description?: string }
const { title, description = 'Complete travel packages — race entry, premium hotels, transfers, and expert local knowledge.' } = Astro.props;
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content={description} />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles/global.css" />
</head>
<body>
  <slot />
</body>
</html>
```

Note: Astro will need `styles/` accessible. Update `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'hybrid',
  adapter: node({ mode: 'standalone' }),
  server: { port: 4321 },
  vite: {
    ssr: { noExternal: ['@libsql/client'] },
    resolve: { alias: { '@': '/src' } }
  }
});
```

And move `styles/` under `public/` or reference it directly. Move to `public/styles/global.css`:

```bash
mkdir -p public/styles
mv styles/global.css public/styles/global.css
rmdir styles
```

- [ ] **Step 2: Write `src/components/Logo.astro`**

```astro
<a href="/" class="logo">
  <span class="logo-one">one</span>
  <span class="logo-run">run</span>
</a>
```

- [ ] **Step 3: Write `src/components/Nav.astro`**

```astro
---
import Logo from './Logo.astro';
---
<nav>
  <Logo />
  <div class="nav-right">
    <span class="lang">EN / ΕΛ</span>
    <a href="/#races" class="nav-cta">Book now</a>
  </div>
</nav>
```

- [ ] **Step 4: Write `src/components/Footer.astro`**

```astro
<footer>
  <div>&copy; 2026 One Run &middot; one-run.net</div>
  <div class="footer-links">
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms</a>
    <a href="/cancellation">Cancellation policy</a>
    <a href="/contact">Contact</a>
  </div>
</footer>
```

- [ ] **Step 5: Write `src/components/StatusPill.astro`**

```astro
---
const statusConfig: Record<string, { label: string; class: string; btnLabel: string; btnClass: string }> = {
  open: { label: 'Open for registration', class: 'open', btnLabel: 'Book now', btnClass: '' },
  soldout: { label: 'Sold out', class: 'soldout', btnLabel: 'Sold out', btnClass: 'disabled' },
  express: { label: 'Express interest', class: 'express', btnLabel: 'Register interest', btnClass: 'express-btn' },
};
const { status } = Astro.props;
const cfg = statusConfig[status];
---
<span class="status-pill {cfg.class}">{cfg.label}</span>
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Base layout, Nav, Logo, Footer, StatusPill components"
```

---

### Task 5: Homepage (SSG)

**Files:**
- Create: `src/components/Hero.astro`, `src/components/RaceCard.astro`, `src/components/RaceGrid.astro`, `src/components/InterestModal.astro`
- Modify/Create: `src/pages/index.astro`

- [ ] **Step 1: Write `src/components/Hero.astro`**

```astro
<div class="hero-content">
  <div class="hero-tag">Marathon Travel Experiences</div>
  <h1 class="hero-h1">Run the world's<br><em>greatest</em> races.</h1>
  <p class="hero-sub">Complete travel packages — race entry, premium hotels, transfers, and expert local knowledge. From Frankfurt to Tokyo.</p>
  <div class="hero-actions">
    <a href="#races" class="btn-primary">Explore races</a>
    <a href="/how-it-works" class="btn-ghost">How it works</a>
  </div>
  <div class="hero-stats">
    <div><div class="stat-n">40+</div><div class="stat-l">Marathons</div></div>
    <div><div class="stat-n">18</div><div class="stat-l">Countries</div></div>
    <div><div class="stat-n">2,400+</div><div class="stat-l">Runners</div></div>
  </div>
</div>
```

- [ ] **Step 2: Write `src/components/RaceCard.astro`**

```astro
---
import StatusPill from './StatusPill.astro';
import { icons } from '../lib/icons';
const { race } = Astro.props;

const statusCfg: Record<string, { label: string; class: string; btnLabel: string; btnClass: string }> = {
  open: { label: 'Open for registration', class: 'open', btnLabel: 'Book now', btnClass: '' },
  soldout: { label: 'Sold out', class: 'soldout', btnLabel: 'Express interest', btnClass: 'disabled' },
  express: { label: 'Express interest', class: 'express', btnLabel: 'Register interest', btnClass: 'express-btn' },
};
const cfg = statusCfg[race.status];
const isBookable = race.status === 'open';

const btnHref = isBookable ? `/races/${race.id}` : '#';
const btnAttrs = isBookable ? '' : `onclick="openInterest('${race.name}')"`;
---
<article class="race-card">
  <div class="race-icon">{@html icons[race.icon] || ''}</div>
  <div class="race-city">{race.city}</div>
  <h3 class="race-name">{race.name}</h3>
  <div class="race-info">
    <div class="race-info-row"><span class="race-info-label">Date</span><span class="race-info-value">{race.date}</span></div>
    <div class="race-info-row"><span class="race-info-label">Rate from</span><span class="race-info-value">{race.price_from}</span></div>
    <div class="race-info-row"><span class="race-info-label">Course</span><span class="race-info-value">{race.terrain}</span></div>
  </div>
  <div class="race-status">
    <StatusPill status={race.status} />
  </div>
  {isBookable ? (
    <a href={btnHref} class="race-btn {cfg.btnClass}">{cfg.btnLabel}</a>
  ) : (
    <button class="race-btn {cfg.btnClass}" {btnAttrs}>{cfg.btnLabel}</button>
  )}
</article>
```

- [ ] **Step 3: Write `src/components/RaceGrid.astro`**

```astro
---
import RaceCard from './RaceCard.astro';
const { races } = Astro.props;
---
<section class="races" id="races">
  <div class="section-header">
    <div>
      <div class="section-tag">2026 Season</div>
      <h2 class="section-title">Upcoming <em>races</em></h2>
    </div>
  </div>

  <div class="filters">
    <div class="filter-group">
      <span class="filter-label">Month</span>
      <select class="filter-select" id="filterMonth" onchange="applyFilters()">
        <option value="all">All months</option>
        <option value="3">March</option><option value="4">April</option>
        <option value="5">May</option><option value="9">September</option>
        <option value="10">October</option><option value="11">November</option>
        <option value="12">December</option>
      </select>
    </div>
    <div class="filter-group">
      <span class="filter-label">Terrain</span>
      <select class="filter-select" id="filterTerrain" onchange="applyFilters()">
        <option value="all">All terrains</option>
        <option value="Flat & fast">Flat & fast</option>
        <option value="Hilly">Hilly</option>
        <option value="Urban">Urban</option>
      </select>
    </div>
    <div class="filter-group">
      <span class="filter-label">Status</span>
      <select class="filter-select" id="filterStatus" onchange="applyFilters()">
        <option value="all">All statuses</option>
        <option value="open">Open for registration</option>
        <option value="express">Express interest</option>
        <option value="soldout">Sold out</option>
      </select>
    </div>
    <button class="filter-reset" onclick="resetFilters()">Reset</button>
  </div>

  <div class="races-grid" id="racesGrid">
    {races.length === 0 ? (
      <div style="padding:60px 20px;grid-column:1/-1;text-align:center;color:var(--mute);font-size:13px;letter-spacing:1px;">No races match your filters.</div>
    ) : (
      races.map((r: any) => <RaceCard race={r} />)
    )}
  </div>
</section>

<script>
  const allRaces = JSON.parse(document.getElementById('races-data')?.textContent || '[]');

  function applyFilters() {
    const m = (document.getElementById('filterMonth') as HTMLSelectElement).value;
    const t = (document.getElementById('filterTerrain') as HTMLSelectElement).value;
    const s = (document.getElementById('filterStatus') as HTMLSelectElement).value;
    const filtered = allRaces.filter((r: any) =>
      (m === 'all' || r.month === parseInt(m)) &&
      (t === 'all' || r.terrain === t) &&
      (s === 'all' || r.status === s)
    );
    const grid = document.getElementById('racesGrid')!;
    if (filtered.length === 0) {
      grid.innerHTML = `<div style="padding:60px 20px;grid-column:1/-1;text-align:center;color:var(--mute);font-size:13px;letter-spacing:1px;">No races match your filters.</div>`;
      return;
    }
    // Re-render filtered cards using pre-existing card HTML from the data attribute
    const cards = filtered.map((r: any) => {
      const cardEl = document.querySelector(`[data-race-id="${r.id}"]`);
      return cardEl?.outerHTML || '';
    }).join('');
    grid.innerHTML = cards;
  }

  function resetFilters() {
    (document.getElementById('filterMonth') as HTMLSelectElement).value = 'all';
    (document.getElementById('filterTerrain') as HTMLSelectElement).value = 'all';
    (document.getElementById('filterStatus') as HTMLSelectElement).value = 'all';
    const grid = document.getElementById('racesGrid')!;
    const allCards = document.querySelectorAll<HTMLElement>('[data-race-id]');
    grid.innerHTML = Array.from(allCards).map(c => c.outerHTML).join('');
  }
</script>
```

Update `RaceCard.astro` to include `data-race-id` attribute:

```astro
<article class="race-card" data-race-id={race.id}>
```

- [ ] **Step 4: Write `src/components/InterestModal.astro`**

```astro
<div class="modal-backdrop" id="modalBackdrop">
  <div class="modal">
    <button class="modal-close" onclick="closeModal()">&times;</button>
    <div class="modal-tag">Express interest</div>
    <h3 class="modal-title" id="modalRaceName">Race Name</h3>
    <p class="modal-sub">Be the first to know when entries open.</p>
    <form id="interestForm">
      <div class="form-group" style="margin-bottom:14px;">
        <label class="form-label">Marathon</label>
        <input type="text" class="form-input" id="modalRaceInput" disabled />
      </div>
      <div class="form-grid" style="gap:14px;margin-bottom:14px;">
        <div class="form-group"><label class="form-label">First name</label><input type="text" class="form-input" name="first_name" required /></div>
        <div class="form-group"><label class="form-label">Last name</label><input type="text" class="form-input" name="last_name" required /></div>
      </div>
      <div class="form-group" style="margin-bottom:14px;"><label class="form-label">Email</label><input type="email" class="form-input" name="email" required /></div>
      <div class="form-group" style="margin-bottom:14px;"><label class="form-label">Phone</label><input type="tel" class="form-input" name="phone" required /></div>
      <button type="submit" class="form-submit">Submit interest</button>
    </form>
  </div>
</div>

<script>
  function openInterest(name: string) {
    (document.getElementById('modalRaceName') as HTMLElement).textContent = name;
    (document.getElementById('modalRaceInput') as HTMLInputElement).value = name;
    document.getElementById('modalBackdrop')!.classList.add('active');
  }
  function closeModal() { document.getElementById('modalBackdrop')!.classList.remove('active'); }
  document.getElementById('modalBackdrop')!.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'modalBackdrop') closeModal();
  });
  document.getElementById('interestForm')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form));
    const res = await fetch('/api/interest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (res.ok) {
      alert("Thank you! We'll be in touch with full package details.");
      form.reset();
      closeModal();
    }
  });
</script>
```

- [ ] **Step 5: Write `src/pages/index.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
import Hero from '../components/Hero.astro';
import RaceGrid from '../components/RaceGrid.astro';
import Footer from '../components/Footer.astro';
import InterestModal from '../components/InterestModal.astro';
import { db } from '../db/index';
import { races } from '../db/schema';

const allRaces = await db.select().from(races).all();
const racesData = allRaces.map(r => ({ ...r, photos: JSON.parse(r.photos || '[]'), included: JSON.parse(r.included || '[]') }));
---

<Base title="One Run — Marathon Travel Experiences">
  <div id="homepage">
    <Nav />
    <section class="hero">
      <Hero />
      <div class="hero-runner"><img src="/runner-hero.jpg" alt="" /></div>
    </section>
    <RaceGrid races={racesData} />
    <Footer />
  </div>
  <InterestModal />
  <script id="races-data" type="application/json">{JSON.stringify(racesData)}</script>
</Base>
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add homepage with race grid, filters, and interest modal"
```

---

### Task 6: SVG Icons Library

**Files:**
- Create: `src/lib/icons.ts`

- [ ] **Step 1: Write `src/lib/icons.ts`**

Copy all icon SVGs from `index.html` line 547 (the `icons` constant). Wrap in a TypeScript module:

```ts
export const icons: Record<string, string> = {
  berlin: `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg">...
  // ... all 10 icons exactly as in index.html
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/icons.ts
git commit -m "feat: add SVG icons library extracted from index.html"
```

---

### Task 7: Static Marketing Pages

**Files:**
- Create: `src/pages/how-it-works.astro`, `src/pages/terms.astro`, `src/pages/privacy.astro`, `src/pages/cancellation.astro`

- [ ] **Step 1: Write `src/pages/how-it-works.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
---
<Base title="How it works — One Run">
  <Nav />
  <section style="padding:160px 48px 80px;max-width:720px;margin:0 auto;">
    <div class="section-tag">How it works</div>
    <h2 class="section-title" style="margin-bottom:48px;">Marathon travel, <em>simplified</em></h2>

    <div style="display:flex;flex-direction:column;gap:48px;">
      <div>
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:500;margin-bottom:12px;">1. Pick your race</h3>
        <p style="font-size:15px;line-height:1.8;color:rgba(243,239,232,0.65);">Browse our calendar of 2026 marathons across Europe, Asia, and North America. Filter by month, terrain, or status to find your perfect race.</p>
      </div>
      <div>
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:500;margin-bottom:12px;">2. Choose your hotel &amp; package</h3>
        <p style="font-size:15px;line-height:1.8;color:rgba(243,239,232,0.65);">Select from hand-picked hotels — from 5-star luxury to excellent-value 4-star options. Pick single or twin occupancy. Every package includes race entry, 3 nights, transfers, and local support.</p>
      </div>
      <div>
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:500;margin-bottom:12px;">3. Register &amp; pay</h3>
        <p style="font-size:15px;line-height:1.8;color:rgba(243,239,232,0.65);">Fill in your runner details. Pay securely via Revolut (card, Apple Pay, or Google Pay). Receive instant confirmation by email.</p>
      </div>
      <div>
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:500;margin-bottom:12px;">4. Show up &amp; run</h3>
        <p style="font-size:15px;line-height:1.8;color:rgba(243,239,232,0.65);">Within 2-4 business days you'll receive your race bib confirmation, hotel voucher, transfer details, and a personal contact. All you have to do is train and show up.</p>
      </div>
    </div>
  </section>
  <Footer />
</Base>
```

- [ ] **Step 2: Write `src/pages/terms.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
---
<Base title="Terms of Service — One Run">
  <Nav />
  <section style="padding:160px 48px 80px;max-width:720px;margin:0 auto;">
    <div class="section-tag">Legal</div>
    <h2 class="section-title" style="margin-bottom:32px;">Terms of <em>service</em></h2>
    <div style="font-size:14px;line-height:1.9;color:rgba(243,239,232,0.65);">
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:500;color:#f3efe8;margin:32px 0 16px;">1. Bookings</h3>
      <p>All bookings are subject to availability. A booking is confirmed once payment has been received and a confirmation email has been sent. One Run reserves the right to cancel any booking if payment is not received or if the booking is fraudulent.</p>

      <h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:500;color:#f3efe8;margin:32px 0 16px;">2. Race entry</h3>
      <p>Race entry is included in all packages. One Run acts as an intermediary between the runner and the race organizer. We are not responsible for race cancellation or course changes made by the event organizer.</p>

      <h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:500;color:#f3efe8;margin:32px 0 16px;">3. Payment</h3>
      <p>Full payment is required at the time of booking. All prices are in euros (EUR) and include applicable taxes. One Run uses Revolut for payment processing and does not store your payment card details.</p>

      <h3 style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:500;color:#f3efe8;margin:32px 0 16px;">4. Liability</h3>
      <p>One Run is not liable for any injury, loss, or damage sustained during travel or participation in any marathon event. Runners participate at their own risk. Travel insurance is strongly recommended.</p>
    </div>
  </section>
  <Footer />
</Base>
```

- [ ] **Step 3: Write `src/pages/privacy.astro`** — similar structure, GDPR-compliant privacy policy content.

- [ ] **Step 4: Write `src/pages/cancellation.astro`** — cancellation policy with refund tiers.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add how-it-works, terms, privacy, cancellation pages"
```

---

### Task 8: Contact Page

**Files:**
- Create: `src/pages/contact.astro`, `src/components/ContactForm.astro`
- Create: `src/pages/api/contact.ts`

- [ ] **Step 1: Write `src/pages/api/contact.ts`**

```ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  // In MVP, just log and return success. Email integration added later.
  console.log('Contact form submission:', data);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

- [ ] **Step 2: Write `src/components/ContactForm.astro`** — reuse form-grid CSS classes from index.html.

- [ ] **Step 3: Write `src/pages/contact.astro`** — page wrapping ContactForm with Nav/Footer.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add contact page and API endpoint"
```

---

### Task 9: Race Detail Page (SSG)

**Files:**
- Create: `src/pages/races/[id].astro`
- Create: `src/components/HotelCardCompact.astro`

- [ ] **Step 1: Create the dynamic route for SSG**

Astro hybrid mode requires `export const prerender = true` for SSG pages. Use `getStaticPaths()` to pre-build all race detail pages at build time.

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
import Logo from '../../components/Logo.astro';
import HotelCardCompact from '../../components/HotelCardCompact.astro';
import { db } from '../../db/index';
import { races as racesTable, hotels as hotelsTable } from '../../db/schema';
import { icons } from '../../lib/icons';
import { eq } from 'drizzle-orm';

export async function getStaticPaths() {
  const allRaces = await db.select().from(racesTable).all();
  return allRaces.map(r => ({ params: { id: r.id } }));
}

const { id } = Astro.params;
const race = await db.select().from(racesTable).where(eq(racesTable.id, id!)).get();
if (!race) return Astro.redirect('/');

const racePhotos = JSON.parse(race.photos || '[]');
const includedItems = JSON.parse(race.included || '[]');
const raceHotels = await db.select().from(hotelsTable).where(eq(hotelsTable.race_id, id!)).all();
const hotelsData = raceHotels.map(h => ({ ...h, features: JSON.parse(h.features || '[]') }));

const statusCfg: Record<string, { label: string; class: string; btnLabel: string; btnClass: string }> = {
  open: { label: 'Open for registration', class: 'open', btnLabel: 'Book now', btnClass: '' },
  soldout: { label: 'Sold out', class: 'soldout', btnLabel: 'Express interest', btnClass: 'disabled' },
  express: { label: 'Express interest', class: 'express', btnLabel: 'Register interest', btnClass: 'express-btn' },
};
const cfg = statusCfg[race.status];
const hasHotels = hotelsData.length > 0;
const anySeats = hotelsData.some(h => (h.total_seats - h.booked_seats) > 0);
const isBookable = race.status === 'open' && hasHotels && anySeats;
---

<Base title={`${race.name} — One Run`}>
  <Nav />

  <div class="detail-page active" id="detailPage">
    <div class="detail-nav">
      <a href="/" class="detail-back"><span class="detail-back-arrow"></span>Back to races</a>
      <Logo />
    </div>

    <section class="detail-compact">
      <div class="detail-left">
        <div class="detail-header">
          <div class="race-city">{race.city}</div>
          <h1>{race.name}</h1>
        </div>

        <div class="detail-meta-strip">
          <div class="meta-item"><div class="meta-l">Date</div><div class="meta-v">{race.date}</div></div>
          <div class="meta-item"><div class="meta-l">Distance</div><div class="meta-v">42.195 km</div></div>
          <div class="meta-item"><div class="meta-l">Terrain</div><div class="meta-v">{race.terrain}</div></div>
          <div class="meta-item"><div class="meta-l">From</div><div class="meta-v">{race.price_from}</div></div>
        </div>

        <div class="detail-info-row">
          <div class="detail-desc-compact"><p>{race.desc1}</p></div>
          <div class="detail-included-compact">
            <h3>Included</h3>
            <ul class="included-list-compact">
              {includedItems.map((item: string) => <li>{item}</li>)}
            </ul>
          </div>
        </div>

        <div class="detail-photos-stack" id="dPhotosGallery">
          <div class="gallery-photo icon-photo">{@html icons[race.icon] || ''}</div>
          {racePhotos.map((p: string) => <div class="gallery-photo"><span>{p}</span></div>)}
        </div>
      </div>

      <div class="detail-right">
        <div class="detail-right-header">
          <div class="section-tag" style="margin-bottom:6px;">Step 1 — choose your hotel</div>
          <h3 class="detail-right-title">Hotels &amp; <em>packages</em></h3>
        </div>

        <div class="hotels-grid-compact" id="hotelsGrid">
          {hotelsData.length === 0 ? (
            <div style="padding:40px 20px;text-align:center;color:var(--mute);font-size:13px;">Hotel options coming soon.</div>
          ) : (
            hotelsData.map(h => <HotelCardCompact hotel={h} raceId={race.id} bookable={isBookable} />)
          )}
        </div>

        {isBookable && (
          <>
            <div class="detail-right-header" style="margin-top:14px;">
              <div class="section-tag" style="margin-bottom:6px;">Step 2 — choose room &amp; occupancy</div>
            </div>
            <div class="occupancy-section">
              <select class="occupancy-select" id="occupancySelect" onchange="selectOccupancy()" disabled>
                <option value="">Pick a hotel first…</option>
              </select>
            </div>
            <div class="continue-bar-compact">
              <div class="continue-info-compact" id="continueText">No package selected</div>
              <button class="continue-btn" id="continueBtn" disabled onclick="goToBooking('${race.id}')">Continue &rarr;</button>
            </div>
          </>
        )}

        {!isBookable && (
          <div class="continue-bar-compact">
            <div class="continue-info-compact">This race is currently not open for booking.</div>
            <button class="continue-btn express-btn" style="width:100%;" onclick="openInterest('${race.name.replace(/'/g, "\\'")}')">Express interest</button>
          </div>
        )}
      </div>
    </section>
  </div>

  <Footer />

  <script>
    let currentHotel: any = null;
    let currentPackageType: string | null = null;

    const hotelsJson = JSON.parse(document.getElementById('hotels-data')!.textContent || '[]');

    function selectHotel(card: HTMLElement, hotelId: string) {
      document.querySelectorAll('.hotel-card-compact').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      currentHotel = hotelsJson.find((h: any) => h.id === hotelId);

      const sel = document.getElementById('occupancySelect') as HTMLSelectElement;
      sel.innerHTML = `<option value="">Choose room & occupancy&hellip;</option>
        <option value="single">${currentHotel.name} — Single Room & 1 Race Entry — €${currentHotel.single_price.toLocaleString()}</option>
        <option value="twin">${currentHotel.name} — Twin / Double Room & 2 Race Entries — €${currentHotel.twin_price.toLocaleString()}</option>`;
      sel.disabled = false;
      sel.value = '';
      currentPackageType = null;
      (document.getElementById('continueText') as HTMLElement).textContent = 'Now choose your room type…';
      (document.getElementById('continueBtn') as HTMLButtonElement).disabled = true;
    }

    function selectOccupancy() {
      const v = (document.getElementById('occupancySelect') as HTMLSelectElement).value;
      if (!v) { currentPackageType = null; (document.getElementById('continueBtn') as HTMLButtonElement).disabled = true; return; }
      currentPackageType = v;
      const price = v === 'single' ? currentHotel.single_price : currentHotel.twin_price;
      const roomLabel = v === 'single' ? 'Single Room & 1 Race Entry' : 'Twin / Double Room & 2 Race Entries';
      (document.getElementById('continueText') as HTMLElement).innerHTML = `<strong>${currentHotel.name}</strong> &middot; ${roomLabel} — <strong>€${price.toLocaleString()}</strong>`;
      (document.getElementById('continueBtn') as HTMLButtonElement).disabled = false;
    }

    function goToBooking(raceId: string) {
      if (!currentHotel) return;
      const searchParams = new URLSearchParams({
        race_id: raceId,
        hotel_id: currentHotel.id,
        package_type: currentPackageType || 'single'
      });
      window.location.href = `/booking?${searchParams.toString()}`;
    }
  </script>
  <script id="hotels-data" type="application/json">{JSON.stringify(hotelsData)}</script>
</Base>
```

- [ ] **Step 2: Write `src/components/HotelCardCompact.astro`**

```astro
---
const { hotel, raceId, bookable } = Astro.props;
const stars = '★'.repeat(hotel.stars);
const features = (hotel.features as string[]).slice(0, 2).join(' · ');
const seatsLeft = hotel.total_seats - hotel.booked_seats;
const soldOut = seatsLeft <= 0;
const cardClass = soldOut ? 'hotel-card-compact' : 'hotel-card-compact';
const onclick = (bookable && !soldOut) ? `onclick="selectHotel(this,'${hotel.id}')"` : '';
---
<article class={cardClass} {...{ [onclick ? 'onclick' : 'data-click']: onclick }}>
  {hotel.website && <a href={hotel.website} target="_blank" rel="noopener noreferrer" class="hc-website-link" onclick="event.stopPropagation()">Visit ↗</a>}
  <div class="hc-photo"><span>{hotel.name}</span></div>
  <div class="hc-content">
    <div class="hc-name-row">
      <span class="hc-name">{hotel.name}</span>
      <span class="hc-stars">{stars}</span>
    </div>
    <div class="hc-area">{hotel.area}</div>
    <div class="hc-features">{features} · from €{hotel.single_price.toLocaleString()}</div>
    {soldOut && <div style="color:var(--red);font-size:10px;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px;">Sold out</div>}
    {!soldOut && <div style="color:var(--mute);font-size:10px;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px;">{seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} left</div>}
  </div>
</article>
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add race detail page with hotel selection and occupancy"
```

---

### Task 10: Booking Page (SSR)

**Files:**
- Create: `src/pages/booking.astro`
- Create: `src/components/RunnerForm.astro`, `src/components/ProgressBar.astro`

- [ ] **Step 1: Write `src/pages/booking.astro`**

SSR page that reads query params (`race_id`, `hotel_id`, `package_type`), fetches race + hotel from DB, renders runner forms, and submits to `/api/book`.

```astro
---
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
import Logo from '../components/Logo.astro';
import ProgressBar from '../components/ProgressBar.astro';
import RunnerForm from '../components/RunnerForm.astro';
import { db } from '../db/index';
import { races as racesTable, hotels as hotelsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const prerender = false;

const url = new URL(Astro.request.url);
const raceId = url.searchParams.get('race_id');
const hotelId = url.searchParams.get('hotel_id');
const packageType = url.searchParams.get('package_type') || 'single';

if (!raceId || !hotelId) return Astro.redirect('/');

const race = await db.select().from(racesTable).where(eq(racesTable.id, raceId)).get();
const hotel = await db.select().from(hotelsTable).where(eq(hotelsTable.id, hotelId)).get();
if (!race || !hotel) return Astro.redirect('/');

const runnerCount = packageType === 'twin' ? 2 : 1;
const totalPrice = packageType === 'twin' ? hotel.twin_price : hotel.single_price;
const pkgLabel = packageType === 'single' ? 'Single Room & 1 Race Entry' : 'Twin / Double Room & 2 Race Entries';
---

<Base title={`Book ${race.name} — One Run`}>
  <Nav />
  <div class="booking-page active">
    <nav>
      <a href={`/races/${raceId}`} class="detail-back"><span class="detail-back-arrow"></span>Back</a>
      <Logo />
      <span></span>
    </nav>

    <ProgressBar currentStep={2} />

    <div class="booking-body">
      <div class="booking-summary">
        <div>
          <div class="summary-race-city">{race.city}</div>
          <div class="summary-race-name">{race.name}</div>
        </div>
        <div class="summary-pkg">Selected package<strong id="bPkg">{pkgLabel}<br><span style="font-size:13px;color:var(--mute);font-weight:400;">{hotel.name}</span></strong></div>
      </div>

      <form id="bookingForm">
        {Array.from({ length: runnerCount }, (_, i) => <RunnerForm index={i + 1} totalRunners={runnerCount} />)}

        <div class="payment-section">
          <h3>Payment</h3>
          <div class="payment-method">
            <div class="payment-icon">R</div>
            <div>
              <div class="payment-info-l">Secure payment via</div>
              <div class="payment-info-v">Revolut Business · Card / Apple Pay / Google Pay</div>
            </div>
          </div>

          <div class="total-row">
            <div class="total-l">Total to pay</div>
            <div class="total-v">€{totalPrice.toLocaleString()}</div>
          </div>

          <button type="submit" class="pay-btn">Confirm &amp; pay</button>
          <p class="legal-note">By confirming, you agree to our <a href="/terms">Terms</a>, <a href="/privacy">Privacy Policy</a>, and <a href="/cancellation">Cancellation policy</a>.</p>
        </div>
      </form>
    </div>
  </div>

  <script>
    const raceId = '{raceId}';
    const hotelId = '{hotelId}';
    const packageType = '{packageType}';

    document.getElementById('bookingForm')!.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const runners: any[] = [];

      const count = parseInt('{runnerCount}');
      for (let i = 0; i < count; i++) {
        runners.push({
          full_name: formData.get(`full_name_${i}`),
          email: formData.get(`email_${i}`),
          phone: formData.get(`phone_${i}`),
          nationality: formData.get(`nationality_${i}`),
          passport_id: formData.get(`passport_id_${i}`),
          expected_time: formData.get(`expected_time_${i}`),
          requirements: formData.get(`requirements_${i}`) || null,
        });
      }

      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ race_id: raceId, hotel_id: hotelId, package_type: packageType, runners }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Booking failed');
        return;
      }

      const { redirect_url } = await res.json();
      window.location.href = redirect_url;
    });
  </script>
</Base>
```

- [ ] **Step 2: Write `src/components/ProgressBar.astro`**

```astro
---
const { currentStep } = Astro.props;
const steps = [
  { num: 1, label: 'Package', state: currentStep > 1 ? 'done' : currentStep === 1 ? 'active' : '' },
  { num: 2, label: 'Runner details', state: currentStep > 2 ? 'done' : currentStep === 2 ? 'active' : '' },
  { num: 3, label: 'Payment', state: currentStep > 3 ? 'done' : currentStep === 3 ? 'active' : '' },
];
---
<div class="booking-progress">
  {steps.map((s, i) => (
    <>
      {i > 0 && <div class="progress-divider"></div>}
      <div class={`progress-step ${s.state}`}>
        <span class="progress-num">{s.state === 'done' ? '✓' : s.num}</span>
        {s.label}
      </div>
    </>
  ))}
</div>
```

- [ ] **Step 3: Write `src/components/RunnerForm.astro`**

```astro
---
const { index, totalRunners } = Astro.props;
const i = index - 1;
---
<div class="runner-form">
  <div class="runner-form-title">
    <span class="runner-num">{index}</span>
    {totalRunners === 1 ? 'Runner registration' : `Runner ${index} — registration`}
  </div>
  <div class="form-grid">
    <div class="form-group full">
      <label class="form-label">Full name</label>
      <input type="text" class="form-input" name={`full_name_${i}`} placeholder="As shown on passport / ID" required />
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input type="email" class="form-input" name={`email_${i}`} required />
    </div>
    <div class="form-group">
      <label class="form-label">Telephone number</label>
      <input type="tel" class="form-input" name={`phone_${i}`} placeholder="+30 ..." required />
    </div>
    <div class="form-group">
      <label class="form-label">Nationality</label>
      <input type="text" class="form-input" name={`nationality_${i}`} required />
    </div>
    <div class="form-group">
      <label class="form-label">ID or passport number</label>
      <input type="text" class="form-input" name={`passport_id_${i}`} required />
    </div>
    <div class="form-group">
      <label class="form-label">Expected race completion time</label>
      <input type="text" class="form-input" name={`expected_time_${i}`} placeholder="e.g. 3:45:20" required />
    </div>
    <div class="form-group">
      <label class="form-label optional">Previous race certificate</label>
      <label class="form-file">
        <input type="file" name={`certificate_${i}`} accept=".pdf,.jpg,.jpeg,.png" />
        <span>📎 Attach file (PDF, JPG, PNG)</span>
      </label>
    </div>
    <div class="form-group full">
      <label class="form-label optional">Special requirements</label>
      <textarea class="form-input form-textarea" name={`requirements_${i}`} rows={3} placeholder="Dietary, accessibility, medical, kit pickup preferences..."></textarea>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add booking page with runner forms and progress bar"
```

---

### Task 11: Booking API & Payment Integration

**Files:**
- Create: `src/pages/api/book.ts`, `src/lib/revolut.ts`
- Create: `src/pages/api/payment/create.ts`, `src/pages/api/payment/webhook.ts`, `src/pages/api/payment/confirm/[ref].ts`
- Create: `src/lib/settings.ts`

- [ ] **Step 1: Write `src/lib/settings.ts`**

```ts
import { db } from '../db/index';
import { settings } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value, updated_at: new Date().toISOString() } });
}
```

- [ ] **Step 2: Write `src/pages/api/book.ts`**

```ts
import type { APIRoute } from 'astro';
import { db } from '../../db/index';
import { bookings, runners, hotels } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { getSetting } from '../../lib/settings';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { race_id, hotel_id, package_type, runners: runnerData } = body;

  if (!race_id || !hotel_id || !package_type || !runnerData?.length) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  // Validate runner count
  if (package_type === 'single' && runnerData.length !== 1) {
    return new Response(JSON.stringify({ error: 'Single package requires 1 runner' }), { status: 400 });
  }
  if (package_type === 'twin' && runnerData.length !== 2) {
    return new Response(JSON.stringify({ error: 'Twin package requires 2 runners' }), { status: 400 });
  }

  // Atomically check and update seats
  const result = await db.transaction(async (tx) => {
    const hotel = await tx.select().from(hotels).where(eq(hotels.id, hotel_id)).get();
    if (!hotel) throw new Error('Hotel not found');

    const needed = package_type === 'twin' ? 2 : 1;
    if (hotel.booked_seats + needed > hotel.total_seats) {
      throw new Error('No seats available');
    }

    // Update seats
    await tx.update(hotels).set({ booked_seats: hotel.booked_seats + needed }).where(eq(hotels.id, hotel_id));

    // Create booking
    const bookingId = 'ONR-' + Date.now().toString(36).toUpperCase().slice(-6) + '-' + race_id.slice(0, 3).toUpperCase();
    const totalAmount = package_type === 'twin' ? hotel.twin_price : hotel.single_price;

    await tx.insert(bookings).values({
      id: bookingId,
      race_id,
      hotel_id,
      package_type,
      total_amount: totalAmount,
      currency: 'EUR',
      status: 'pending',
    });

    // Insert runners
    for (const r of runnerData) {
      await tx.insert(runners).values({
        booking_id: bookingId,
        full_name: r.full_name,
        email: r.email,
        phone: r.phone,
        nationality: r.nationality,
        passport_id: r.passport_id,
        expected_time: r.expected_time,
        requirements: r.requirements || null,
      });
    }

    return { bookingId, totalAmount };
  });

  // Create Revolut order
  const revolutUrl = await createRevolutOrder(result.bookingId, result.totalAmount, race_id);

  return new Response(JSON.stringify({ booking_id: result.bookingId, redirect_url: revolutUrl }), { status: 200 });
};

async function createRevolutOrder(bookingId: string, amount: number, raceId: string): Promise<string> {
  const apiKey = await getSetting('revolut_api_key');
  const baseUrl = 'https://merchant.revolut.com/api/1.0';

  if (!apiKey) {
    // Fallback: redirect to fake confirmation for testing
    return `/confirm/${bookingId}?test=1`;
  }

  const res = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amount * 100, // Revolut expects cents
      currency: 'EUR',
      capture_mode: 'AUTOMATIC',
      redirect_url: `https://one-run.net/confirm/${bookingId}`,
      cancel_url: `https://one-run.net/races/${raceId}`,
      description: `One Run booking ${bookingId}`,
    }),
  });

  if (!res.ok) throw new Error('Revolut order creation failed');

  const order = await res.json() as any;

  // Save Revolut order ID
  await db.update(bookings).set({ revolut_order_id: order.id }).where(eq(bookings.id, bookingId));

  return order.checkout_url || `/confirm/${bookingId}`;
}
```

- [ ] **Step 3: Write `src/pages/api/payment/webhook.ts`**

```ts
import type { APIRoute } from 'astro';
import { db } from '../../../db/index';
import { bookings, hotels } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { sendBookingConfirmation } from '../../../lib/resend';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { event, order_id } = body;

  if (event !== 'ORDER_COMPLETED') {
    console.log('Webhook event ignored:', event);
    return new Response('OK', { status: 200 });
  }

  // Idempotent: only process if booking is still pending
  const booking = await db.select().from(bookings).where(eq(bookings.revolut_order_id, order_id)).get();
  if (!booking) return new Response('OK', { status: 200 });
  if (booking.status === 'paid') return new Response('OK', { status: 200 });

  await db.update(bookings).set({ status: 'paid', updated_at: new Date().toISOString() }).where(eq(bookings.id, booking.id));

  // Send confirmation email
  await sendBookingConfirmation(booking.id).catch(e => console.error('Email failed:', e));

  return new Response('OK', { status: 200 });
};
```

- [ ] **Step 4: Write `src/pages/api/payment/confirm/[ref].ts`**

```ts
import type { APIRoute } from 'astro';
import { db } from '../../../../db/index';
import { bookings } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ params }) => {
  const booking = await db.select().from(bookings).where(eq(bookings.id, params.ref!)).get();
  if (!booking) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  return new Response(JSON.stringify({ status: booking.status, amount: booking.total_amount }), { status: 200 });
};
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add booking API, Revolut payment integration, webhook handler"
```

---

### Task 12: Payment Fallback Mode (No Revolut Key)

When `revolut_api_key` is not set in settings, the booking flow should still work for testing. The `api/book.ts` already falls back to `/confirm/ONR-XXXXXX?test=1`. The confirmation page needs to handle this test mode.

**Files:**
- Create: `src/pages/confirm/[ref].astro`

- [ ] **Step 1: Write `src/pages/confirm/[ref].astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import Logo from '../../components/Logo.astro';
import { db } from '../../db/index';
import { bookings, runners, hotels, races } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const prerender = false;

const { ref } = Astro.params;
const booking = await db.select().from(bookings).where(eq(bookings.id, ref!)).get();

if (!booking) return Astro.redirect('/');

const race = await db.select().from(races).where(eq(races.id, booking.race_id)).get();
const hotel = await db.select().from(hotels).where(eq(hotels.id, booking.hotel_id)).get();
const pkgLabel = booking.package_type === 'single' ? 'Single Room & 1 Race Entry' : 'Twin / Double Room & 2 Race Entries';
---

<Base title="Booking Confirmed — One Run">
  <div class="confirm-page active">
    <div class="confirm-content">
      <div class="confirm-icon">&check;</div>
      <h2 class="confirm-title">Thank <em>you</em>.</h2>
      <p class="confirm-text">Your payment has been received and your booking is confirmed.<br />A confirmation email is on its way to your inbox.</p>

      <div class="confirm-details">
        <div class="confirm-row"><span class="l">Race</span><span class="v">{race?.name || 'N/A'}</span></div>
        <div class="confirm-row"><span class="l">Package</span><span class="v">{pkgLabel}<br /><span style="font-size:11px;color:var(--mute);">{hotel?.name || 'N/A'}</span></span></div>
        <div class="confirm-row"><span class="l">Booking ref</span><span class="v">{booking.id}</span></div>
        <div class="confirm-row total"><span class="l">Paid</span><span class="v">&euro;{booking.total_amount.toLocaleString()}</span></div>
      </div>

      <p class="confirm-next"><strong>Next steps:</strong> Within 2&ndash;4 business days you'll receive full registration details &mdash; race bib confirmation, hotel voucher, transfer instructions and a personal contact for your trip.</p>

      <a href="/" class="btn-primary" style="margin-top:32px;">Back to home</a>
    </div>
  </div>
</Base>
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add confirmation page and payment fallback test mode"
```

---

### Task 13: Express Interest API

**Files:**
- Create: `src/pages/api/interest.ts`

- [ ] **Step 1: Write `src/pages/api/interest.ts`**

```ts
import type { APIRoute } from 'astro';
import { db } from '../../db/index';
import { interestRegistrations } from '../../db/schema';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { first_name, last_name, email, phone } = body;
  const race_name = (document.getElementById('modalRaceInput') as any)?.value || body.race_name; // fallback

  await db.insert(interestRegistrations).values({
    race_name: body.race_name || race_name,
    first_name,
    last_name,
    email,
    phone,
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

Wait — the `dialog.getElementById` won't work server-side. Fix to read `race_name` from request body only:

```ts
import type { APIRoute } from 'astro';
import { db } from '../../db/index';
import { interestRegistrations } from '../../db/schema';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { race_name, first_name, last_name, email, phone } = body;

  if (!race_name || !first_name || !last_name || !email) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  await db.insert(interestRegistrations).values({
    race_name: body.race_name,
    first_name,
    last_name,
    email,
    phone,
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

Update `InterestModal.astro` to include `race_name` in form submission:

Changed: add `<input type="hidden" name="race_name" id="interestRaceName" />` and set its value in `openInterest()`.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add express interest API endpoint"
```

---

### Task 14: Resend Email Integration

**Files:**
- Create: `src/lib/resend.ts`

- [ ] **Step 1: Write `src/lib/resend.ts`**

```ts
import { Resend } from 'resend';
import { getSetting } from './settings';
import { db } from '../db/index';
import { bookings, runners, races } from '../db/schema';
import { eq } from 'drizzle-orm';

async function getClient(): Promise<Resend | null> {
  const apiKey = await getSetting('resend_api_key');
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendBookingConfirmation(bookingId: string): Promise<void> {
  const resend = await getClient();
  if (!resend) { console.log('Resend not configured, skipping email'); return; }

  const booking = await db.select().from(bookings).where(eq(bookings.id, bookingId)).get();
  if (!booking) return;

  const race = await db.select().from(races).where(eq(races.id, booking.race_id)).get();
  const bookingRunners = await db.select().from(runners).where(eq(runners.booking_id, bookingId)).all();
  const fromEmail = (await getSetting('from_email')) || 'noreply@one-run.net';

  for (const runner of bookingRunners) {
    await resend.emails.send({
      from: `One Run <${fromEmail}>`,
      to: runner.email,
      subject: `Booking confirmed — ${race?.name || 'Your marathon'}`,
      html: `
        <h1>Booking confirmed!</h1>
        <p>Hi ${runner.full_name},</p>
        <p>Your booking for <strong>${race?.name || 'your marathon'}</strong> is confirmed.</p>
        <p><strong>Booking reference:</strong> ${booking.id}</p>
        <p><strong>Amount paid:</strong> €${booking.total_amount.toLocaleString()}</p>
        <p>Within 2-4 business days you'll receive full registration details — race bib confirmation, hotel voucher, transfer instructions, and a personal contact for your trip.</p>
        <p>— The One Run Team</p>
      `,
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add Resend email integration for booking confirmation"
```

---

### Task 15: Admin Authentication

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/pages/api/admin/auth.ts`

- [ ] **Step 1: Write `src/lib/auth.ts`**

```ts
import type { AstroCookies } from 'astro';
import { getSetting } from './settings';

const COOKIE_NAME = 'onerun_admin';

export async function verifyPassword(password: string): Promise<boolean> {
  const stored = await getSetting('admin_password');
  if (!stored) {
    // Default password if none set: 'onerun2026'
    return password === 'onerun2026';
  }
  return password === stored;
}

export function isAdmin(cookies: AstroCookies): boolean {
  return cookies.get(COOKIE_NAME)?.value === 'true';
}

export function setAdminCookie(cookies: AstroCookies): void {
  cookies.set(COOKIE_NAME, 'true', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}
```

- [ ] **Step 2: Write `src/pages/api/admin/auth.ts`**

```ts
import type { APIRoute } from 'astro';
import { verifyPassword, setAdminCookie } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { password } = await request.json();
  const valid = await verifyPassword(password);
  if (!valid) return new Response(JSON.stringify({ error: 'Invalid password' }), { status: 401 });

  setAdminCookie(cookies);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add admin authentication with cookie-based session"
```

---

### Task 16: Admin Dashboard

**Files:**
- Create: `src/pages/admin/login.astro`, `src/pages/admin/index.astro`
- Create: `src/components/AdminNav.astro`

- [ ] **Step 1: Write `src/pages/admin/login.astro`**

```astro
---
import Base from '../../layouts/Base.astro';
export const prerender = false;

if (Astro.request.method === 'POST') {
  // Handled by client-side JS
}
---
<Base title="Admin Login — One Run">
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);">
    <form id="loginForm" style="max-width:360px;width:100%;padding:48px 32px;background:var(--card);border:1px solid var(--border);">
      <div class="modal-tag">Admin</div>
      <h3 class="modal-title" style="margin-bottom:24px;">Sign in</h3>
      <div class="form-group" style="margin-bottom:14px;">
        <label class="form-label">Password</label>
        <input type="password" class="form-input" name="password" required autofocus />
      </div>
      <button type="submit" class="form-submit">Sign in</button>
    </form>
  </div>
</Base>

<script>
  document.getElementById('loginForm')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form));
    const res = await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (res.ok) { window.location.href = '/admin'; }
    else { alert('Invalid password'); }
  });
</script>
```

- [ ] **Step 2: Write `src/pages/admin/index.astro`** — dashboard

```astro
---
import Base from '../../layouts/Base.astro';
import AdminNav from '../../components/AdminNav.astro';
import { db } from '../../db/index';
import { bookings, interestRegistrations } from '../../db/schema';
import { desc } from 'drizzle-orm';
import { isAdmin } from '../../lib/auth';

export const prerender = false;
if (!isAdmin(Astro.cookies)) return Astro.redirect('/admin/login');

const recentBookings = await db.select().from(bookings).orderBy(desc(bookings.created_at)).limit(20).all();
const recentInterest = await db.select().from(interestRegistrations).orderBy(desc(interestRegistrations.created_at)).limit(10).all();
const paidBookings = recentBookings.filter(b => b.status === 'paid');
const totalRevenue = paidBookings.reduce((sum, b) => sum + b.total_amount, 0);
---

<Base title="Admin Dashboard — One Run">
  <AdminNav />
  <section style="padding:120px 48px 80px;max-width:1100px;margin:0 auto;">
    <div class="section-tag">Admin</div>
    <h2 class="section-title" style="margin-bottom:48px;">Dashboard</h2>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:48px;">
      <div style="background:var(--card);border:1px solid var(--border);padding:24px;">
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--mute);margin-bottom:8px;">Total Bookings</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:500;">{recentBookings.length}</div>
      </div>
      <div style="background:var(--card);border:1px solid var(--border);padding:24px;">
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--mute);margin-bottom:8px;">Paid Bookings</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:500;">{paidBookings.length}</div>
      </div>
      <div style="background:var(--card);border:1px solid var(--border);padding:24px;">
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--mute);margin-bottom:8px;">Total Revenue</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:500;">&euro;{totalRevenue.toLocaleString()}</div>
      </div>
    </div>

    <h3 style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:500;margin-bottom:20px;">Recent Bookings</h3>
    <div style="overflow-x:auto;margin-bottom:48px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:1px solid var(--border);text-align:left;">
            <th style="padding:12px 8px;color:var(--mute);font-weight:400;letter-spacing:1px;">Ref</th>
            <th style="padding:12px 8px;color:var(--mute);font-weight:400;letter-spacing:1px;">Race</th>
            <th style="padding:12px 8px;color:var(--mute);font-weight:400;letter-spacing:1px;">Package</th>
            <th style="padding:12px 8px;color:var(--mute);font-weight:400;letter-spacing:1px;">Amount</th>
            <th style="padding:12px 8px;color:var(--mute);font-weight:400;letter-spacing:1px;">Status</th>
            <th style="padding:12px 8px;color:var(--mute);font-weight:400;letter-spacing:1px;">Date</th>
          </tr>
        </thead>
        <tbody>
          {recentBookings.map(b => (
            <tr style="border-bottom:1px solid rgba(243,239,232,0.04);">
              <td style="padding:10px 8px;color:var(--accent);">{b.id}</td>
              <td style="padding:10px 8px;">{b.race_id}</td>
              <td style="padding:10px 8px;">{b.package_type}</td>
              <td style="padding:10px 8px;">&euro;{b.total_amount.toLocaleString()}</td>
              <td style="padding:10px 8px;">
                <span style={`display:inline-block;padding:3px 10px;border-radius:999px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;${b.status === 'paid' ? 'background:#2da94f;color:#fff;' : b.status === 'pending' ? 'background:#e8893f;color:#fff;' : 'background:#d9453f;color:#fff;'}`}>{b.status}</span>
              </td>
              <td style="padding:10px 8px;color:var(--mute);">{b.created_at?.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <h3 style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:500;margin-bottom:20px;">Recent Interest Registrations</h3>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:1px solid var(--border);text-align:left;">
            <th style="padding:12px 8px;color:var(--mute);font-weight:400;letter-spacing:1px;">Race</th>
            <th style="padding:12px 8px;color:var(--mute);font-weight:400;letter-spacing:1px;">Name</th>
            <th style="padding:12px 8px;color:var(--mute);font-weight:400;letter-spacing:1px;">Email</th>
            <th style="padding:12px 8px;color:var(--mute);font-weight:400;letter-spacing:1px;">Phone</th>
            <th style="padding:12px 8px;color:var(--mute);font-weight:400;letter-spacing:1px;">Date</th>
          </tr>
        </thead>
        <tbody>
          {recentInterest.map(ir => (
            <tr style="border-bottom:1px solid rgba(243,239,232,0.04);">
              <td style="padding:10px 8px;">{ir.race_name}</td>
              <td style="padding:10px 8px;">{ir.first_name} {ir.last_name}</td>
              <td style="padding:10px 8px;">{ir.email}</td>
              <td style="padding:10px 8px;">{ir.phone}</td>
              <td style="padding:10px 8px;color:var(--mute);">{ir.created_at?.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
</Base>
```

- [ ] **Step 3: Write `src/components/AdminNav.astro`**

```astro
---
import Logo from './Logo.astro';
---
<nav style="background:rgba(0,0,0,0.92);border-bottom:1px solid var(--border);position:fixed;top:0;left:0;right:0;z-index:100;padding:14px 48px;display:flex;align-items:center;justify-content:space-between;">
  <div style="display:flex;align-items:center;gap:36px;">
    <Logo />
    <a href="/admin" style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--mute);">Dashboard</a>
    <a href="/admin/races" style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--mute);">Races</a>
    <a href="/admin/settings" style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--mute);">Settings</a>
  </div>
  <a href="/" style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--mute);">View site</a>
</nav>
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add admin login, dashboard, and admin nav"
```

---

### Task 17: Admin Race Management CRUD

**Files:**
- Create: `src/pages/admin/races.astro`, `src/pages/admin/races/[id].astro`
- Create: `src/pages/api/admin/races.ts`, `src/pages/api/admin/races/[id].ts`
- Create: `src/pages/api/admin/hotels.ts`, `src/pages/api/admin/hotels/[id].ts`

- [ ] **Step 1: Write `src/pages/api/admin/races.ts`** — GET list all races, POST create new race.

```ts
import type { APIRoute } from 'astro';
import { isAdmin } from '../../../lib/auth';
import { db } from '../../../db/index';
import { races } from '../../../db/schema';

export const GET: APIRoute = async ({ cookies }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const all = await db.select().from(races).all();
  return new Response(JSON.stringify(all), { status: 200 });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const body = await request.json();
  await db.insert(races).values({
    id: body.id,
    name: body.name,
    city: body.city,
    icon: body.icon,
    date: body.date,
    month: body.month,
    price_from: body.price_from,
    terrain: body.terrain,
    status: body.status,
    desc1: body.desc1,
    desc2: body.desc2 || '',
    photos: JSON.stringify(body.photos || []),
    included: JSON.stringify(body.included || ['Race entry & bib', 'Hotel (3 nights)', 'Transfers', 'Welcome dinner', 'Race day support', 'Local SIM']),
  });

  return new Response(JSON.stringify({ ok: true }), { status: 201 });
};
```

- [ ] **Step 2: Write `src/pages/api/admin/races/[id].ts`** — PUT update, DELETE race.

```ts
import type { APIRoute } from 'astro';
import { isAdmin } from '../../../../lib/auth';
import { db } from '../../../../db/index';
import { races } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const body = await request.json();
  await db.update(races).set({
    name: body.name, city: body.city, icon: body.icon, date: body.date,
    month: body.month, price_from: body.price_from, terrain: body.terrain,
    status: body.status, desc1: body.desc1, desc2: body.desc2,
    photos: JSON.stringify(body.photos || []),
    included: JSON.stringify(body.included || []),
    updated_at: new Date().toISOString(),
  }).where(eq(races.id, params.id!));

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

export const DELETE: APIRoute = async ({ cookies, params }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  await db.delete(races).where(eq(races.id, params.id!));
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

- [ ] **Step 3: Write `src/pages/admin/races.astro`** — list races with add form

Full Astro page with inline table and an add-race form (reuse form-grid CSS classes). Include edit/delete buttons that POST to API routes.

- [ ] **Step 4: Write `src/pages/admin/races/[id].astro`** — edit single race

Shows race edit form + hotel list + add hotel form. Hotels CRUD via admin API routes.

- [ ] **Step 5: Write `src/pages/api/admin/hotels.ts`** and `[id].ts`

Similar pattern: GET/POST for hotels list, PUT/DELETE for individual hotel.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add admin race and hotel CRUD API + pages"
```

---

### Task 18: Admin Settings Page

**Files:**
- Create: `src/pages/admin/settings.astro`
- Create: `src/pages/api/admin/settings.ts`

- [ ] **Step 1: Write `src/pages/api/admin/settings.ts`**

```ts
import type { APIRoute } from 'astro';
import { isAdmin } from '../../../lib/auth';
import { getSetting, setSetting } from '../../../lib/settings';

export const GET: APIRoute = async ({ cookies }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const keys = ['revolut_api_key', 'resend_api_key', 'admin_password', 'from_email'];
  const result: Record<string, string> = {};
  for (const k of keys) {
    const v = await getSetting(k);
    result[k] = v ? (k.includes('api_key') || k.includes('password') ? '••••••••' : v) : '';
  }
  return new Response(JSON.stringify(result), { status: 200 });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const body = await request.json();
  for (const [key, value] of Object.entries(body)) {
    if (value && typeof value === 'string' && !value.startsWith('••••')) {
      await setSetting(key, value as string);
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

- [ ] **Step 2: Write `src/pages/admin/settings.astro`** — form with 4 fields

Form with fields for Revolut API key, Resend API key, admin password, from email. Pre-populates with masked values. PUTs to `/api/admin/settings`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add admin settings page and API"
```

---

### Task 19: Admin Bookings & Cancel APIs

**Files:**
- Create: `src/pages/api/admin/bookings.ts`, `src/pages/api/admin/bookings/[id]/cancel.ts`

- [ ] **Step 1: Write `src/pages/api/admin/bookings.ts`**

GET: list all bookings with optional status filter query param. Returns booking + runner data.

- [ ] **Step 2: Write `src/pages/api/admin/bookings/[id]/cancel.ts`**

POST: verify admin, set booking status to `cancelled`, release seats.

```ts
import type { APIRoute } from 'astro';
import { isAdmin } from '../../../../lib/auth';
import { db } from '../../../../db/index';
import { bookings, hotels } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ cookies, params }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const booking = await db.select().from(bookings).where(eq(bookings.id, params.id!)).get();
  if (!booking) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  if (booking.status === 'cancelled') return new Response(JSON.stringify({ error: 'Already cancelled' }), { status: 400 });

  await db.transaction(async (tx) => {
    await tx.update(bookings).set({ status: 'cancelled', updated_at: new Date().toISOString() }).where(eq(bookings.id, params.id!));
    const needed = booking.package_type === 'twin' ? 2 : 1;
    const hotel = await tx.select().from(hotels).where(eq(hotels.id, booking.hotel_id)).get();
    if (hotel) {
      await tx.update(hotels).set({ booked_seats: Math.max(0, hotel.booked_seats - needed) }).where(eq(hotels.id, booking.hotel_id));
    }
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add admin bookings list and cancel API"
```

---

### Task 20: Admin Upload API (Photos)

**Files:**
- Create: `src/pages/api/admin/upload.ts`

- [ ] **Step 1: Write `src/pages/api/admin/upload.ts`**

```ts
import type { APIRoute } from 'astro';
import { isAdmin } from '../../../lib/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) return new Response(JSON.stringify({ error: 'No file' }), { status: 400 });

  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadDir = join(process.cwd(), 'src', 'data', 'uploads');
  await writeFile(join(uploadDir, filename), buffer);

  return new Response(JSON.stringify({ url: `/uploads/${filename}` }), { status: 200 });
};
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add admin photo upload API"
```

---

### Task 21: Docker Configuration

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Write `Dockerfile`**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx drizzle-kit push
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/data ./data

EXPOSE 4321
ENV HOST=0.0.0.0
ENV PORT=4321

CMD ["node", "dist/server/entry.mjs"]
```

- [ ] **Step 2: Add build script to `package.json`**

Ensure `package.json` has:
```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "start": "node dist/server/entry.mjs"
  }
}
```

- [ ] **Step 3: Test Docker build**

```bash
docker build -t onerun .
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Dockerfile and build configuration"
```

---

### Task 22: Dokploy Deployment

**Steps:**
- [ ] **Step 1: Create GitHub repo** and push the code

```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```

- [ ] **Step 2: Connect to Dokploy** using the Dokploy MCP

Using the Dokploy MCP (`npx -y @dokploy/mcp` with env vars from `dokploy.txt`):

1. Create project "One run" on server `hetzner-ccx13`
2. Create a new application within the project:
   - Type: Application (Docker)
   - Source: GitHub repo
   - Branch: main
   - Build method: Dockerfile
   - Port: 4321

3. Add a persistent volume mount:
   - Source path: `/data`
   - Mount path: `/app/data`
   - This persists the SQLite database and uploads between deploys

- [ ] **Step 3: Test deployment** — push a commit, verify app deploys successfully on Dokploy.

- [ ] **Step 4: Verify at** `https://<app-url>.tetrajobs.online`

---

## Plan Summary

| Task | Component | Files |
|---|---|---|
| 1 | Project scaffold | 5 files |
| 2 | Database schema + seed | 3 files |
| 3 | Global CSS | 1 file |
| 4 | Layout + shared components | 5 files |
| 5 | Homepage | 5 files |
| 6 | SVG icons | 1 file |
| 7 | Static marketing pages | 4 files |
| 8 | Contact page + API | 3 files |
| 9 | Race detail page (SSG) | 3 files |
| 10 | Booking page (SSR) | 3 files |
| 11 | Booking API + Revolut | 5 files |
| 12 | Confirmation page | 1 file |
| 13 | Express interest API | 1 file |
| 14 | Resend email | 1 file |
| 15 | Admin auth | 2 files |
| 16 | Admin dashboard | 3 files |
| 17 | Admin CRUD (races/hotels) | 6 files |
| 18 | Admin settings | 2 files |
| 19 | Admin bookings + cancel | 2 files |
| 20 | Admin upload | 1 file |
| 21 | Docker config | 1 file |
| 22 | Dokploy deployment | — |

