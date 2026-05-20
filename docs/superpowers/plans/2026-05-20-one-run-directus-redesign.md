# One Run Directus Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the SQLite/custom-admin One Run app with an Astro public site backed by Directus at `admin.one-run.net`, while completing the mockup booking, email, and cancellation functionality.

**Architecture:** Directus becomes the single admin/CMS/operations panel and runs as a separate Dokploy template service. Astro remains the public site and transaction engine, using server-side Directus API calls for content and operational records.

**Tech Stack:** Astro 5, Node adapter, Directus REST API, Directus files API, Revolut Merchant API, Resend, Dokploy, Docker.

---

## File Structure

- Create: `src/lib/directus.ts` — Directus REST client, auth headers, request helpers, file upload helper.
- Create: `src/lib/bookingTokens.ts` — generate and verify secure cancellation tokens.
- Create: `src/lib/bookingEmails.ts` — email templates and send helpers for booking/cancellation lifecycle.
- Create: `src/data/mockupSeed.ts` — normalized seed data extracted from `index.html`.
- Create: `scripts/seed-directus.mjs` — creates/updates Directus records for races, hotels, packages.
- Modify: `src/pages/index.astro` — fetch races from Directus.
- Modify: `src/components/RaceGrid.astro` — make filtering robust from serialized Directus data.
- Modify: `src/components/RaceCard.astro` — align status behavior with Directus package availability.
- Modify: `src/pages/races/[id].astro` — fetch race, hotels, and packages from Directus.
- Modify: `src/components/HotelCardCompact.astro` — render Directus package data and remaining seats.
- Modify: `src/pages/booking.astro` — use package ID and Directus-backed data.
- Modify: `src/pages/api/book.ts` — create Directus booking/runners/files and Revolut checkout.
- Modify: `src/pages/api/payment/webhook.ts` — update Directus booking status and send emails.
- Modify: `src/pages/api/payment/confirm/[ref].ts` — read Directus booking status.
- Create: `src/pages/cancel/[ref].astro` — customer cancellation page.
- Create: `src/pages/api/cancel/[ref].ts` — pending cancellation and paid cancellation request endpoint.
- Modify: `src/pages/api/interest.ts` — store interest registrations in Directus and send acknowledgement.
- Modify: `src/pages/api/contact.ts` — store contact messages in Directus and notify admin.
- Modify: `src/pages/admin/index.astro` and other `/admin` pages — redirect to `https://admin.one-run.net` or remove after redirect route exists.
- Modify: `package.json` — add Directus seed script if needed.
- Modify: `Dockerfile` — remove Drizzle build steps when Directus replacement is complete.

## Task 1: Directus Service Setup In Dokploy

**Files:** none initially; this is infrastructure.

- [ ] **Step 1: Create Directus template service**

Use Dokploy UI: `One run` project → `Create Service` → `Template` → Directus.

Expected: a new Directus service exists in the same project/environment as the Astro app.

- [ ] **Step 2: Configure Directus domain**

Add domain `admin.one-run.net` to the Directus service.

Expected: Dokploy domain record exists for `admin.one-run.net` with HTTPS enabled.

- [ ] **Step 3: Configure DNS**

Create an `A` record: `admin.one-run.net -> 138.199.205.111`.

Expected verification command:

```powershell
Resolve-DnsName -Name 'admin.one-run.net' -Type A
```

Expected: `IPAddress` is `138.199.205.111`.

- [ ] **Step 4: Verify Directus loads**

Run:

```powershell
curl.exe -I https://admin.one-run.net
```

Expected: HTTP 200/302/401 from Directus, not a DNS or TLS failure.

## Task 2: Directus Schema Setup

**Files:** Directus admin UI collections; optional later export under `directus/schema`.

- [ ] **Step 1: Create `races` collection**

Fields: `id`, `name`, `city`, `icon`, `date`, `month`, `price_from`, `terrain`, `status`, `desc1`, `desc2`, `included`, `sort`.

Expected: Directus collection exists and can create a Berlin Marathon record.

- [ ] **Step 2: Create `hotels` collection**

Fields: `id`, `race` relation, `name`, `area`, `stars`, `features`, `website`, `sort`.

Expected: Hotel records can link to a race.

- [ ] **Step 3: Create `packages` collection**

Fields: `id`, `hotel` relation, `type`, `label`, `runner_count`, `price`, `currency`, `total_seats`, `booked_seats`, `active`.

Expected: single and twin packages can link to a hotel.

- [ ] **Step 4: Create transactional collections**

Create `bookings`, `runners`, `interest_registrations`, `contact_messages`, and `cancellation_requests` using the field names in `docs/superpowers/specs/2026-05-20-one-run-directus-redesign.md`.

Expected: Directus can display a booking with related runners and cancellation requests.

- [ ] **Step 5: Create Directus token**

Create a server-side static token with create/read/update permissions for these collections and file upload permission.

Expected: token works with:

```powershell
curl.exe -H "Authorization: Bearer <token>" https://admin.one-run.net/items/races
```

## Task 3: Directus Client

**Files:**
- Create: `src/lib/directus.ts`

- [ ] **Step 1: Add Directus types and client helper**

Create `src/lib/directus.ts` with interfaces for race, hotel, package, booking, runner, interest, contact, and cancellation request. Implement `directusRequest`, `directusGetItems`, `directusCreateItem`, `directusUpdateItem`, and `directusUploadFile`.

- [ ] **Step 2: Build check**

Run:

```powershell
npm run build
```

Expected: build succeeds or fails only because callers have not migrated yet. Fix type/import errors before continuing.

## Task 4: Seed Directus From Mockup Data

**Files:**
- Create: `src/data/mockupSeed.ts`
- Create: `scripts/seed-directus.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create normalized seed data**

Extract the race and hotel data currently present in `index.html` and existing `src/db/seed.ts` into `src/data/mockupSeed.ts`. Include packages as separate single/twin records per hotel.

- [ ] **Step 2: Create idempotent seed script**

Create `scripts/seed-directus.mjs` that upserts races, hotels, and packages through Directus REST.

- [ ] **Step 3: Add package script**

Add this script to `package.json`:

```json
"directus:seed": "node scripts/seed-directus.mjs"
```

- [ ] **Step 4: Run seed**

Run:

```powershell
$env:DIRECTUS_URL='https://admin.one-run.net'; $env:DIRECTUS_TOKEN='<token>'; npm run directus:seed
```

Expected: all mockup races, hotels, and packages exist in Directus.

## Task 5: Public Race Content Migration

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/components/RaceGrid.astro`
- Modify: `src/components/RaceCard.astro`
- Modify: `src/pages/races/[id].astro`
- Modify: `src/components/HotelCardCompact.astro`

- [ ] **Step 1: Replace homepage DB calls**

Change `src/pages/index.astro` to fetch races from Directus using `directusGetItems('races')` sorted by `sort`.

- [ ] **Step 2: Fix serialized race data**

Use `set:html={JSON.stringify(racesData)}` for the `races-data` script so client filters receive valid JSON.

- [ ] **Step 3: Replace race detail DB calls**

Change `src/pages/races/[id].astro` to fetch one race, its hotels, and packages from Directus.

- [ ] **Step 4: Verify public content**

Run:

```powershell
npm run build
```

Expected: build succeeds and generated homepage/race pages include Directus data.

## Task 6: Booking Flow Migration

**Files:**
- Modify: `src/pages/booking.astro`
- Modify: `src/pages/api/book.ts`
- Create: `src/lib/bookingTokens.ts`

- [ ] **Step 1: Use package ID in booking URLs**

Change race detail continuation to pass `package_id` instead of `hotel_id` + `package_type` only.

- [ ] **Step 2: Update booking page loader**

Fetch package, hotel, and race from Directus by `package_id`. Use package `runner_count` and `price`.

- [ ] **Step 3: Create cancellation token helper**

Implement token generation and SHA-256 hashing in `src/lib/bookingTokens.ts`.

- [ ] **Step 4: Update booking API**

Create Directus booking and runner records, increment package `booked_seats`, upload certificate files when supplied, and create Revolut checkout.

- [ ] **Step 5: Verify booking API manually**

Run Astro locally and submit a booking.

Expected: Directus contains `pending` booking and related runners, and package `booked_seats` increments.

## Task 7: Email Lifecycle

**Files:**
- Create: `src/lib/bookingEmails.ts`
- Modify: `src/pages/api/book.ts`
- Modify: `src/pages/api/payment/webhook.ts`
- Modify: `src/pages/api/interest.ts`
- Modify: `src/pages/api/contact.ts`

- [ ] **Step 1: Create email helpers**

Implement Resend helpers for booking confirmation, admin new booking, interest acknowledgement, contact notification, cancellation request acknowledgement, cancellation confirmation, and cancellation rejection.

- [ ] **Step 2: Wire confirmation email**

Call booking confirmation and admin notification when a booking becomes `paid`.

- [ ] **Step 3: Wire interest/contact emails**

Store Directus records first, then send acknowledgement/notification emails.

- [ ] **Step 4: Verify fallback behavior**

Run without `RESEND_API_KEY`.

Expected: API requests succeed and log email skipping instead of throwing.

## Task 8: Payment Webhook And Confirmation

**Files:**
- Modify: `src/pages/api/payment/webhook.ts`
- Modify: `src/pages/api/payment/confirm/[ref].ts`
- Modify: `src/pages/confirm/[ref].astro`

- [ ] **Step 1: Update webhook to Directus**

Find booking by `revolut_order_id`, update status to `paid`, store payment metadata, and send emails idempotently.

- [ ] **Step 2: Update confirmation status endpoint**

Read booking status and details from Directus.

- [ ] **Step 3: Update confirmation page**

Show status-specific copy: paid confirmation, pending payment, cancellation requested, cancelled.

- [ ] **Step 4: Verify webhook idempotency**

Call webhook twice with the same order ID.

Expected: second call does not duplicate emails or corrupt booking status.

## Task 9: Cancellation Flow

**Files:**
- Create: `src/pages/cancel/[ref].astro`
- Create: `src/pages/api/cancel/[ref].ts`
- Modify: `src/lib/bookingEmails.ts`

- [ ] **Step 1: Create customer cancellation page**

Show booking reference, current status, and cancellation action based on token validity.

- [ ] **Step 2: Create cancellation API**

If booking status is `pending`, set `cancelled`, release seats, send cancellation email. If status is `paid`, create cancellation request, set `cancellation_requested`, send acknowledgement.

- [ ] **Step 3: Admin completion path**

Document Directus admin operation: admin changes booking to `cancelled` after approving a request. If Directus Flows are available, configure a webhook to call an Astro endpoint that releases seats and sends final email.

- [ ] **Step 4: Verify both paths**

Create one pending booking and one paid booking.

Expected: pending cancels immediately; paid creates `cancellation_requests` record.

## Task 10: Remove Custom Admin And SQLite

**Files:**
- Modify/Delete: `src/pages/admin/**/*.astro`
- Modify/Delete: `src/pages/api/admin/**/*.ts`
- Modify/Delete: `src/db/*`
- Modify: `Dockerfile`
- Modify: `package.json`

- [ ] **Step 1: Redirect `/admin`**

Replace custom admin pages with redirects to `https://admin.one-run.net`.

- [ ] **Step 2: Remove admin APIs**

Delete custom admin APIs after Directus covers the admin workflow.

- [ ] **Step 3: Remove Drizzle runtime dependency**

Remove imports and Docker Drizzle steps after all public/API code uses Directus.

- [ ] **Step 4: Build check**

Run:

```powershell
npm run build
```

Expected: build succeeds with no Drizzle imports in active code.

## Task 11: Deployment Verification

**Files:** deployment configuration only.

- [ ] **Step 1: Configure Astro env vars in Dokploy**

Set `DIRECTUS_URL`, `DIRECTUS_TOKEN`, `PUBLIC_SITE_URL`, and payment/email secrets.

- [ ] **Step 2: Deploy Astro**

Trigger Dokploy deployment for `one-run-app-ink0j2`.

- [ ] **Step 3: Verify public domain**

Run:

```powershell
curl.exe -I https://one-run.net
```

Expected: `HTTP/1.1 200 OK`.

- [ ] **Step 4: Verify Directus domain**

Run:

```powershell
curl.exe -I https://admin.one-run.net
```

Expected: Directus responds over HTTPS.

- [ ] **Step 5: End-to-end booking test**

Use the public site to create a booking.

Expected: Directus booking and runners exist, confirmation page works, and email behavior matches available API keys.

## Self-Review

- Spec coverage: every approved requirement is represented in Tasks 1-11.
- Placeholder scan: no task contains unresolved placeholders for product behavior; secret values are intentionally supplied by environment/Dokploy.
- Type consistency: collection names and key fields match the spec.
