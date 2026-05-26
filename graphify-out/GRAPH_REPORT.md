# Graph Report - .  (2026-05-22)

## Corpus Check
- 48 files · ~252,658 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 83 nodes · 173 edges · 9 communities (7 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]

## God Nodes (most connected - your core abstractions)
1. `directusCreateItem()` - 12 edges
2. `directusUpdateItem()` - 9 edges
3. `sendAdminNotificationEmail()` - 8 edges
4. `send()` - 7 edges
5. `POST()` - 7 edges
6. `sendBookingConfirmationEmail()` - 6 edges
7. `directusGetItems()` - 6 edges
8. `POST()` - 6 edges
9. `hashCancellationToken()` - 5 edges
10. `verifyCancellationToken()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `upsertBySlug()` --calls--> `directusCreateItem()`  [EXTRACTED]
  scripts/seed-directus.ts → src/lib/directus.ts
- `upsertBySlug()` --calls--> `directusUpdateItem()`  [EXTRACTED]
  scripts/seed-directus.ts → src/lib/directus.ts
- `POST()` --calls--> `sendBookingConfirmationEmail()`  [EXTRACTED]
  src/pages/api/book.ts → src/lib/bookingEmails.ts
- `POST()` --calls--> `sendAdminNotificationEmail()`  [EXTRACTED]
  src/pages/api/book.ts → src/lib/bookingEmails.ts
- `POST()` --calls--> `verifyCancellationToken()`  [EXTRACTED]
  src/pages/api/cancel/[ref].ts → src/lib/bookingTokens.ts

## Communities (9 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (10): client, db, bookings, hotels, interestRegistrations, races, runners, settings (+2 more)

### Community 1 - "Community 1"
Cohesion: 0.19
Nodes (13): buildUrl(), DirectusBooking, DirectusConfig, directusGetItem(), directusGetItems(), DirectusHotel, DirectusPackage, DirectusRace (+5 more)

### Community 2 - "Community 2"
Cohesion: 0.29
Nodes (12): POST(), POST(), POST(), getTransporter(), send(), sendAdminNotificationEmail(), sendBookingConfirmationEmail(), sendCancellationEmail() (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.22
Nodes (10): included, SeedHotel, seedHotels, SeedPackage, seedPackages, SeedRace, seedRaces, directusUpdateItem() (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.54
Nodes (5): POST(), createCancellationToken(), hashCancellationToken(), verifyCancellationToken(), rawToken

## Knowledge Gaps
- **15 isolated node(s):** `ItemWithId`, `Locals`, `SeedRace`, `SeedHotel`, `SeedPackage` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `directusCreateItem()` connect `Community 2` to `Community 1`, `Community 3`, `Community 4`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `directusUpdateItem()` connect `Community 3` to `Community 1`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `directusGetItems()` connect `Community 1` to `Community 2`, `Community 3`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `ItemWithId`, `Locals`, `SeedRace` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._