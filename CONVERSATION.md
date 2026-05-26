# One Run Platform — Full Conversation Log

## Overview

Built a full-stack marathon travel booking platform using **Astro** (frontend + API) and **Directus** (headless CMS/admin), deployed on **Dokploy** at `hetzner-ccx13` (138.199.205.111).

**Domains:**
- `https://one-run.net` — Public site
- `https://admin.one-run.net` — Directus admin panel

---

## Architecture

- **Astro 5** with Node.js adapter (SSR + SSG hybrid)
- **Directus 11** as headless CMS (separate Dokploy compose service)
- **PostgreSQL** (Directus database via `postgis/postgis:13-master`)
- **Nodemailer SMTP** for emails (`mail.one-run.net:465`)
- **Docker** for containerized deployment
- **Dokploy** for CI/CD from GitHub

### Dokploy IDs

| Resource | ID |
|----------|----|
| Server | `pyGcgFIfvKcDSClc2Ovkg` (hetzner-ccx13) |
| Project | `IOGyirehg6YcArnU4XZL_` (One run) |
| Environment | `3pc5mCcK1hKutnf_qPD6Z` (production) |
| Astro App | `5aBd0gedBxT9n7q5ToaJm` (one-run-app-ink0j2-lz7acx) |
| Directus Compose | `1_qq-PN7fWU5fDSb8aKBI` (one-run-directus-mrlrm7) |

### Astro Dokploy Environment

```
DIRECTUS_URL=https://admin.one-run.net
DIRECTUS_TOKEN=F2lTPvIpgwNYrEfMVHZkc4DAyiboBRUuexJOSWQLd0KCtq1z57jhX3968nsGam
PUBLIC_SITE_URL=https://one-run.net
SMTP_HOST=mail.one-run.net
SMTP_PORT=465
SMTP_USER=support@one-run.net
SMTP_PASS=OrJKnSx9X.uSs3fh
FROM_EMAIL=One Run <support@one-run.net>
```

### OpenCode MCP Configuration

```json
{
  "mcp": {
    "dokploy": {
      "type": "local",
      "command": ["npx.cmd", "-y", "@dokploy/mcp"],
      "enabled": true,
      "env": {
        "DOKPLOY_URL": "https://apps.tetrajobs.online",
        "DOKPLOY_API_KEY": "kGeklGpXLUwKTcfxTWakCMkrHUHOLEksWtuikywcDnEPtZXbsgwYAcHfBaHPxKMG"
      }
    },
    "directus": {
      "type": "remote",
      "url": "https://admin.one-run.net/mcp",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer QZQJkH3fs_5Wv9i7QF0TavgigIwZp9Ot"
      }
    }
  }
}
```

---

## Directus Collections

### races
- `id` (integer PK), `slug` (unique), `name`, `city`, `icon`, `date`, `month`
- `price_from` (ASCII-safe: "EUR 1290"), `terrain`, `status` (open/soldout/express)
- `desc1`, `desc2`, `photos` (JSON/tags), `included` (JSON)
- `sort` (display order)

### hotels
- `id`, `slug`, `race` (relation to races), `name`, `area`, `stars`
- `features` (JSON/tags), `website`, `photos` (JSON/tags), `sort`
- `photo` (single image, relation to `directus_files`)

### packages
- `id`, `slug`, `hotel` (relation), `type` (single/twin), `label`
- `runner_count`, `price` (integer euros), `currency` (EUR)
- `total_seats`, `booked_seats`, `active`

### bookings
- `id`, `reference` (ONR-XXXXXX-XXX), `race`, `hotel`, `package`
- `status` (pending/paid/cancellation_requested/cancelled/failed)
- `total_amount`, `currency`, `revolut_order_id`, `revolut_payment_id`
- `cancellation_token_hash`, `cancelled_at`

### runners
- `id`, `booking` (relation), `full_name`, `email`, `phone`
- `nationality`, `passport_id`, `expected_time`
- `certificate` (file), `requirements`

### interest_registrations
- `id`, `race` (optional relation), `race_name`, `first_name`, `last_name`
- `email`, `phone`, `message`

### contact_messages
- `id`, `name`, `email`, `phone`, `message`, `status` (new/read/archived)

### cancellation_requests
- `id`, `booking` (relation), `requester_email`, `reason`
- `status` (requested/approved/rejected), `resolved_at`

### settings
- `key`, `value` (key-value store for future use)

---

## Key Files

```
src/
  lib/
    directus.ts          — Directus REST client + types
    bookingTokens.ts     — Cancellation token generation/verification
    bookingEmails.ts     — SMTP email sending via nodemailer
    display.ts           — Character conversion (ASCII-safe → Unicode)
  components/
    RaceCard.astro       — Homepage race cards
    RaceGrid.astro       — Race grid + filter bar
    HotelCardCompact.astro — Hotel cards on race detail
    Hero.astro           — Hero section tagline
    Logo.astro           — "one run" + "travel packages" sub-line
    Nav.astro            — Navigation bar
    Footer.astro         — Footer
    StatusPill.astro     — Status indicator (open/soldout/express)
    InterestModal.astro  — Express interest popup form
    IconSVG.astro        — SVG landmark icons
  pages/
    index.astro          — Homepage (SSR, fetches races from Directus)
    races/[id].astro     — Race detail page (SSR)
    booking.astro        — Booking/runners form (SSR)
    confirm/[ref].astro  — Booking confirmation (SSR)
    cancel/[ref].astro   — Customer cancellation page (SSR)
    api/
      book.ts            — Create booking + payment
      cancel/[ref].ts    — Customer cancellation logic
      interest.ts        — Store interest registrations
      contact.ts         — Store contact messages
      payment/
        webhook.ts       — Revolut payment webhook
        confirm/[ref].ts — Payment status check
  data/
    mockupSeed.ts        — Seed data for races/hotels/packages
scripts/
  seed-directus.ts       — Directus seeding script
  fix-encoding.ts        — Character encoding repair script
tests/
  directus.test.ts       — Directus client tests
  bookingTokens.test.ts  — Token tests
  mockupSeed.test.ts     — Seed data tests
```

---

## Booking Flow

1. Customer browses races (homepage, SSR from Directus)
2. Clicks a race → race detail with hotels/packages
3. Selects hotel → Step 2 dropdown populates with room types
4. Selects occupancy → Continue button activates
5. Booking page: fills runner form(s), clicks Confirm & Pay
6. API creates booking (pending), increments capacity
7. If no Revolut API key: auto-pays, sends emails
8. If Revolut: creates checkout order, redirects to Revolut
9. Webhook confirms payment → booking status becomes "paid"
10. Confirmation emails sent via SMTP

## Cancellation Flow

- **Pending booking**: Cancel immediately via secure link, seats released, email sent
- **Paid booking**: Creates `cancellation_requests` record in Directus, booking status becomes `cancellation_requested`
- Admin approves/rejects in Directus

## Email Notifications (SMTP via nodemailer)

- Booking confirmation → each runner
- Admin notification → new booking alert
- Interest acknowledgement → submitter
- Cancellation notification → runners
- Cancellation request → runners + admin
- Contact form → admin

## Tests

7 tests passing (vitest):
- Directus client (4 tests): config, GET, POST, single item
- Booking tokens (1 test): create/hash/verify
- Mockup seed (2 tests): race list, package generation

---

## Bug Fixes & Key Learnings

### Vite Script Scoping
**Problem**: `onclick`/`onchange` inline handlers couldn't find functions defined in `<script>` blocks.
**Fix**: Replaced all inline handlers with `addEventListener` in the script blocks.

### Character Encoding
**Problem**: Unicode characters (`€`, `—`, `★`, `ΕΛ`) stored as `???` in PostgreSQL.
**Root cause**: PostgreSQL encoding doesn't support full UTF-8. Node.js SSR also corrupts.
**Fix**: Store ASCII-safe data in DB (`EUR 1290`, `|` for `·`, `*` for `★`) and convert in Astro templates using `.replace()` methods.

### Directus Field Relations
**Problem**: File image picker wouldn't save — `photo` field missing foreign key to `directus_files`.
**Fix**: Created proper relation with `foreign_key_table: directus_files`, `foreign_key_column: id`.

### JSON Editor UX
**Problem**: `features` and `photos` fields used JSON editor which showed empty popups.
**Fix**: Changed interface to `tags` for easy add/edit of items.

### Race Detail SSR 500
**Problem**: Creating an `alias` type field for images broke the Directus API (`column races.images does not exist`).
**Fix**: Deleted the broken field. For future image uploads, use properly configured file fields with foreign keys.

### Type Mismatch in Hotel Selection
**Problem**: `h.id === hotelId` — `hotelId` from `dataset` is string, `h.id` is integer.
**Fix**: Changed to `h.id === Number(hotelId)`.

---

## Races Currently Live

| # | Race | Status | Price From |
|---|------|--------|------------|
| 1 | Berlin Marathon | open | EUR 1,290 |
| 2 | Frankfurt Marathon | open | EUR 1,190 |
| 3 | Athens Classic Marathon | open | EUR 890 |
| 4 | Valencia Marathon | open | EUR 990 |
| 5 | Paris Marathon | soldout | EUR 1,390 |
| 6 | London Marathon | soldout | EUR 1,590 |
| 7 | Rome Marathon | express | EUR 1,090 |
| 8 | Amsterdam Marathon | express | EUR 1,150 |
| 9 | New York City Marathon | express | EUR 2,890 |
| 10 | Tokyo Marathon | soldout | EUR 2,490 |
| 11 | Boston Marathon | open | EUR 2,190 |

---

## How to Add a New Race

From Directus admin (`https://admin.one-run.net/admin`):

1. **Content → Races → + Create Item**
2. Fill: `slug`, `name`, `city`, `icon` (use existing SVG key), `date`, `month`, `price_from` (format: `EUR 2190`), `terrain`, `status`, `desc1/desc2`, `sort`
3. **Content → Hotels → + Create Item** (per hotel)
4. Fill: `slug`, `race` relation, `name`, `area` (use `|` for `·`, `*` for `★`), `stars`, `features`, `website`, `sort`, `photo` (optional image)
5. **Content → Packages → + Create Item** (one single + one twin per hotel)
6. Fill: `slug`, `hotel` relation, `type`, `label`, `runner_count`, `price`, `total_seats`, `booked_seats` (0), `active` (checked)

---

## How to Edit Hotel Info

From Directus admin:

- **Features**: Each feature is a separate tag — click to add/remove
- **Photos**: Text labels shown in race detail gallery
- **Photo**: Single image upload (click to pick from file library or upload new — thumbnail shows when set)
- **Area**: Use `|` for `·` and `*` for `★` (e.g. `Back Bay | 5*`)
- **Stars**: Integer value (1-5)

---

## Commands

```bash
npm run build          # Build Astro site
npm run test           # Run vitest tests (7 tests)
npm run dev            # Local dev server
npm run directus:seed  # Seed Directus from mockup data
```

---

## Deployment

- Push to `master` on GitHub → Dokploy auto-deploys
- Manual deploy: `POST /api/application.deploy` with application ID
- Directus updates are instant (no deploy needed)
