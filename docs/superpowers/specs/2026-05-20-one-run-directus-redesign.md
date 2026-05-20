# One Run Directus + Astro Redesign

## Goal

Rebuild One Run as a fully functional Astro public site backed by Directus as the single admin/CMS/operations panel. The original `index.html` is a mockup and defines the required customer-facing functionality, not the final implementation architecture.

## Domains

- `https://one-run.net`: Astro public website, customer booking flow, transactional APIs, Revolut webhooks, customer cancellation links.
- `https://admin.one-run.net`: Directus admin panel for all content and operational records.

## Architecture

Astro remains the public application and transaction engine. Directus runs as a separate Dokploy template service in the same `One run` project. Astro talks to Directus through server-side API calls using `DIRECTUS_URL` and `DIRECTUS_TOKEN`.

Directus replaces the custom Astro `/admin` area entirely. Existing `/admin/*` routes in Astro should be removed or redirected to `https://admin.one-run.net`.

Astro owns logic that must be transactional or security-sensitive:

- package capacity checks
- booking creation
- runner certificate upload orchestration
- Revolut checkout creation
- Revolut webhook verification and booking status updates
- Resend emails
- secure customer cancellation links
- customer cancellation request handling

Directus owns the admin interface and data storage:

- races
- hotels
- packages
- files/images/certificates
- bookings
- runners
- interest registrations
- contact messages
- cancellation requests
- site/settings records

## Required Mockup Functionality

All interactive behavior present in `index.html` must exist as real functionality:

- homepage hero and race grid
- race filtering by month, terrain, and status
- race card status logic
- race detail pages
- hotel/package selection
- room/occupancy selection
- runner details form
- certificate upload field
- payment step
- confirmation page
- express interest modal/form
- contact form
- legal/cancellation pages
- booking confirmation emails
- customer cancellation flow
- admin cancellation handling through Directus

## Directus Collections

### races

- `id`: string primary key, e.g. `berlin`
- `name`: string
- `city`: string
- `icon`: string key matching Astro SVG icon names
- `date`: string display date
- `month`: integer 1-12
- `price_from`: string, e.g. `€1,290`
- `terrain`: string enum: `Flat & fast`, `Hilly`, `Urban`
- `status`: string enum: `open`, `soldout`, `express`
- `desc1`: text
- `desc2`: text
- `photos`: Directus files relation or JSON labels during seed
- `included`: JSON array or related included-item records
- `sort`: integer

### hotels

- `id`: string primary key
- `race`: many-to-one relation to `races`
- `name`: string
- `area`: string
- `stars`: integer 1-5
- `features`: JSON array
- `website`: string URL
- `photos`: Directus files relation or placeholder labels
- `sort`: integer

### packages

- `id`: string primary key
- `hotel`: many-to-one relation to `hotels`
- `type`: enum `single`, `twin`
- `label`: string
- `runner_count`: integer, 1 for single and 2 for twin
- `price`: integer whole euros
- `currency`: string, default `EUR`
- `total_seats`: integer
- `booked_seats`: integer
- `active`: boolean

### bookings

- `id`: string booking reference, e.g. `ONR-ABC123-BER`
- `race`: many-to-one relation to `races`
- `hotel`: many-to-one relation to `hotels`
- `package`: many-to-one relation to `packages`
- `status`: enum `pending`, `paid`, `cancellation_requested`, `cancelled`, `failed`
- `total_amount`: integer whole euros
- `currency`: string
- `revolut_order_id`: string nullable
- `revolut_payment_id`: string nullable
- `cancellation_token_hash`: string
- `cancelled_at`: datetime nullable
- `created_at`: datetime
- `updated_at`: datetime

### runners

- `id`: uuid or integer
- `booking`: many-to-one relation to `bookings`
- `full_name`: string
- `email`: string
- `phone`: string
- `nationality`: string
- `passport_id`: string
- `expected_time`: string
- `certificate`: Directus file relation nullable
- `requirements`: text nullable

### interest_registrations

- `id`: uuid or integer
- `race`: optional relation to `races`
- `race_name`: string
- `first_name`: string
- `last_name`: string
- `email`: string
- `phone`: string
- `created_at`: datetime

### contact_messages

- `id`: uuid or integer
- `name`: string
- `email`: string
- `phone`: string nullable
- `message`: text
- `status`: enum `new`, `read`, `archived`
- `created_at`: datetime

### cancellation_requests

- `id`: uuid or integer
- `booking`: many-to-one relation to `bookings`
- `requester_email`: string
- `reason`: text nullable
- `status`: enum `requested`, `approved`, `rejected`
- `requested_at`: datetime
- `resolved_at`: datetime nullable

### settings

Use a Directus singleton or key/value collection containing:

- `site_url`: `https://one-run.net`
- `admin_email`
- `from_email`
- `revolut_api_key`
- `revolut_webhook_secret`
- `resend_api_key`

Secrets may also be stored as Dokploy/Astro environment variables. If both are present, environment variables take priority.

## Booking Flow

1. Customer browses races loaded from Directus.
2. Customer opens a race detail page and selects a hotel.
3. Customer selects a package type: single or twin.
4. Astro loads package availability from Directus.
5. Customer fills runner form and uploads certificates if available.
6. Astro validates required fields and runner count.
7. Astro checks package capacity and reserves seats by incrementing `booked_seats` when the booking is created.
8. Astro creates a `pending` booking and related runner records in Directus.
9. Astro creates a Revolut checkout order.
10. Customer is redirected to Revolut.
11. Revolut webhook marks the booking `paid`.
12. Astro sends booking confirmation emails to runners and a new-booking notification to the admin.
13. Confirmation page displays booking status from Directus.

If Revolut is not configured, test mode may mark bookings paid immediately in non-production environments only.

## Cancellation Flow

The approved cancellation model is option 3:

- Pending or unpaid bookings can be cancelled immediately through a secure customer email link.
- Paid bookings create a cancellation request that an admin handles in Directus.

Customer cancellation link behavior:

1. Confirmation email includes `https://one-run.net/cancel/<booking-id>?token=<raw-token>`.
2. Astro hashes the raw token and compares it to `bookings.cancellation_token_hash`.
3. If the booking is `pending`, Astro changes status to `cancelled`, releases seats, and sends cancellation email.
4. If the booking is `paid`, Astro creates a `cancellation_requests` record and changes booking status to `cancellation_requested`.
5. Admin reviews the request in Directus.
6. Admin cancellation action changes booking status to `cancelled`, releases seats, and sends email.

Refunds remain manual unless Revolut refund automation is added later.

## Email Requirements

Emails are sent through Resend:

- booking confirmation to each runner
- new booking notification to admin
- express interest acknowledgement
- contact form notification to admin
- pending booking cancellation confirmation
- paid booking cancellation request acknowledgement
- admin-approved cancellation confirmation
- cancellation rejection notification

## Deployment Requirements

- Create Directus from Dokploy `Create Service > Template`.
- Add domain `admin.one-run.net` to the Directus service.
- Add DNS `A` record for `admin.one-run.net` pointing to `138.199.205.111`.
- Configure Directus public URL as `https://admin.one-run.net`.
- Configure Astro environment variables:
  - `DIRECTUS_URL=https://admin.one-run.net`
  - `DIRECTUS_TOKEN=<server-token>`
  - `PUBLIC_SITE_URL=https://one-run.net`
  - `RESEND_API_KEY=<key>` or Directus setting
  - `REVOLUT_API_KEY=<key>` or Directus setting
  - `REVOLUT_WEBHOOK_SECRET=<secret>` or Directus setting

## Migration/Cleanup

- Replace SQLite/Drizzle data access with a Directus client.
- Remove Drizzle schema/seed/runtime DB dependency after Directus is active.
- Remove custom admin pages and admin APIs, or redirect `/admin/*` to `https://admin.one-run.net`.
- Keep public legal pages in Astro, optionally editable from Directus later.

## Verification

- `npm run build` succeeds.
- Homepage shows all seeded Directus races.
- Filters work for month, terrain, and status.
- Race detail shows hotel/package options.
- Booking creates Directus booking and runner records.
- Capacity updates correctly and releases on cancellation.
- Confirmation email sends when booking becomes paid.
- Pending customer cancellation works immediately.
- Paid customer cancellation creates a request in Directus.
- Admin cancellation from Directus/Astro action sends email and releases seats.
- `https://one-run.net` loads the public app.
- `https://admin.one-run.net` loads Directus.
