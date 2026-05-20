# One Run — Full-Stack Platform Design

## 1. Architecture

**Astro monolith** with `output: 'hybrid'` via `@astrojs/node` adapter.

| Route pattern | Render mode | Purpose |
|---|---|---|
| `/`, `/races/[id]`, `/terms`, `/privacy`, `/cancellation`, `/contact`, `/how-it-works` | SSG (static) | Marketing pages, SEO-friendly |
| `/booking`, `/api/book`, `/api/payment/*` | SSR (on-demand) | Booking flow, payment, form submission |
| `/admin/*`, `/api/admin/*` | SSR (on-demand) | Admin panel, settings, CRUD |
| `/api/webhook/*` | SSR (on-demand) | Revolut webhook, Resend callbacks |
| `/api/contact`, `/api/interest` | SSR (on-demand) | Contact form, express interest |

**Database:** SQLite via `libsql` + Drizzle ORM. File at `data/onerun.db`, volume-mounted on Dokploy.

**File storage:** `src/data/uploads/` for race photos, hotel photos, runner certificates. Volume-mounted.

**Deployment:** Single Docker container (Node SSR) + persistent volume, hosted on Dokploy at server `hetzner-ccx13` (138.199.205.111).

## 2. Data Model

### races
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | e.g. 'berlin' |
| name | TEXT | 'Berlin Marathon' |
| city | TEXT | 'Berlin, Germany' |
| icon | TEXT | SVG key (berlin, frankfurt, etc.) |
| date | TEXT | '27 Sep 2026' |
| month | INTEGER | 1-12 |
| price_from | TEXT | '€1,290' |
| terrain | TEXT | 'Flat & fast', 'Hilly', 'Urban' |
| status | TEXT | 'open', 'soldout', 'express' |
| desc1 | TEXT | Primary description paragraph |
| desc2 | TEXT | Secondary description paragraph |
| photos | TEXT | JSON array of photo labels |
| included | TEXT | JSON array of included items |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### hotels
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| race_id | TEXT FK | References races.id |
| name | TEXT | |
| area | TEXT | 'Brandenburg Gate · 5★' |
| stars | INTEGER | 1-5 |
| features | TEXT | JSON array of feature strings |
| single_price | INTEGER | Whole euros (e.g. 1890) |
| twin_price | INTEGER | Whole euros |
| total_seats | INTEGER | Total capacity |
| booked_seats | INTEGER | Default 0, incremented on booking |
| website | TEXT | Hotel URL |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### bookings
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | Generated ref, e.g. 'ONR-A1B2C3' |
| race_id | TEXT FK | References races.id |
| hotel_id | TEXT FK | References hotels.id |
| package_type | TEXT | 'single' or 'twin' |
| total_amount | INTEGER | Whole euros |
| currency | TEXT | 'EUR' |
| revolut_order_id | TEXT | Nullable, filled after payment |
| status | TEXT | 'pending', 'paid', 'cancelled' |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### runners
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | Autoincrement |
| booking_id | TEXT FK | References bookings.id |
| full_name | TEXT | |
| email | TEXT | |
| phone | TEXT | |
| nationality | TEXT | |
| passport_id | TEXT | |
| expected_time | TEXT | e.g. '3:45:20' |
| certificate | TEXT | File path, nullable |
| requirements | TEXT | Nullable |
| created_at | TEXT | ISO timestamp |

### interest_registrations
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | Autoincrement |
| race_name | TEXT | |
| first_name | TEXT | |
| last_name | TEXT | |
| email | TEXT | |
| phone | TEXT | |
| created_at | TEXT | ISO timestamp |

### settings
| Column | Type | Notes |
|---|---|---|
| key | TEXT PK | 'revolut_api_key', 'resend_api_key', 'admin_password', 'from_email' |
| value | TEXT | Plain text (set via admin UI) |
| updated_at | TEXT | ISO timestamp |

## 3. Routes

### Public SSG Pages
| Route | Source | Notes |
|---|---|---|
| `/` | `src/pages/index.astro` | Homepage |
| `/races/[id]` | `src/pages/races/[id].astro` | Race detail |
| `/terms` | `src/pages/terms.astro` | Terms of Service |
| `/privacy` | `src/pages/privacy.astro` | Privacy Policy |
| `/cancellation` | `src/pages/cancellation.astro` | Cancellation Policy |
| `/contact` | `src/pages/contact.astro` | Contact form |
| `/how-it-works` | `src/pages/how-it-works.astro` | Explainer page |

### SSR Pages
| Route | Source | Notes |
|---|---|---|
| `/booking` | `src/pages/booking.astro` | Runner form + payment step |
| `/confirm/[ref]` | `src/pages/confirm/[ref].astro` | Confirmation page |
| `/admin/login` | `src/pages/admin/login.astro` | Password entry |
| `/admin` | `src/pages/admin/index.astro` | Dashboard |
| `/admin/races` | `src/pages/admin/races.astro` | Race CRUD list |
| `/admin/races/[id]` | `src/pages/admin/races/[id].astro` | Edit race + hotels |
| `/admin/settings` | `src/pages/admin/settings.astro` | API keys, password |

### API Routes
| Route | Method | Purpose |
|---|---|---|
| `/api/interest` | POST | Save express interest |
| `/api/book` | POST | Create booking + runners |
| `/api/payment/create` | POST | Create Revolut order |
| `/api/payment/webhook` | POST | Revolut confirmation |
| `/api/payment/confirm/[ref]` | GET | Check payment status |
| `/api/contact` | POST | Contact form submission |
| `/api/admin/auth` | POST | Verify admin password |
| `/api/admin/races` | GET/POST | List or create races |
| `/api/admin/races/[id]` | PUT/DELETE | Update or delete race |
| `/api/admin/hotels` | POST | Add hotel to race |
| `/api/admin/hotels/[id]` | PUT/DELETE | Update or delete hotel |
| `/api/admin/settings` | GET/PUT | Read/update settings |
| `/api/admin/upload` | POST | Upload photo |

## 4. Payment Flow (Revolut Merchant API)

1. User fills runner form on `/booking`, hits "Confirm & pay"
2. POST `/api/payment/create` — creates booking (status: pending), calls Revolut `POST /api/orders`, returns redirect URL
3. User redirected to Revolut hosted checkout
4. User completes payment → Revolut redirects to `/confirm/ONR-XXXXXX`
5. Revolut webhook at `/api/payment/webhook` confirms `ORDER_COMPLETED` event — server updates booking to `paid`, sends confirmation email via Resend
6. `/confirm/ONR-XXXXXX` reads booking status and displays confirmation

Webhook is source of truth for payment confirmation. The redirect is UX only.

**Revolut API key** configurable via `/admin/settings` page.

## 5. Seat Capacity Logic

- `Booking logic` runs inside a SQLite transaction:
  - Single room: check `booked_seats + 1 <= total_seats`, increment by 1
  - Twin room: check `booked_seats + 2 <= total_seats`, increment by 2
  - If full: return error "No seats available"
- Frontend: show remaining seats on hotel cards, disable when full
- On cancellation: decrement `booked_seats`

### Race card status logic
| Condition | Button shown | Click action |
|---|---|---|
| status=open AND hotels have seats | "Book now" | Opens detail page |
| status=open but all hotels full | "Express interest" | Opens interest modal |
| status=express | "Register interest" | Opens interest modal |
| status=soldout | "Express interest" | Opens interest modal |

## 6. Admin Panel

Protected by single password from settings. Session cookie based.

**Dashboard:** recent bookings, totals, recent interest registrations.

**Race management:** table with edit/delete, add new race form, per-race hotel management, booking list, interest registrations.

**Hotel management:** add/edit/delete hotels per race, set total_seats, view booked_seats (read-only).

**Settings:** Revolut API key, Resend API key, admin password, from email address.

**Bookings view:** filterable table, expand runner details, manual cancel action.

## 7. Email & Notifications (Resend)

| Trigger | To | Content |
|---|---|---|
| Booking paid | Runner email(s) | Confirmation + reference |
| Booking cancelled | Runner email(s) | Cancellation notice |
| Express interest | Registrant email | Auto-reply acknowledgment |
| New booking | Admin email | Internal notification |
| Contact form | Admin email | Contact inquiry |

**Resend API key** configurable via `/admin/settings`.

## 8. Frontend Components

**Layout:** `src/layouts/Base.astro` — shared `<head>`, nav, footer.

**Components:**

| Component | Where used | Notes |
|---|---|---|
| `Nav.astro` | All pages | Logo, nav links, CTA |
| `Hero.astro` | Homepage | Hero section with stats |
| `RaceCard.astro` | Race grid | Receives race object prop |
| `RaceGrid.astro` | Homepage, admin | Grid + filter bar |
| `Logo.astro` | Nav, detail nav | Tiny reusable |
| `HotelCard.astro` | Detail page, admin | Selectable hotel |
| `RunnerForm.astro` | Booking page | Dynamic based on runner count |
| `ProgressBar.astro` | Booking page | 3-step indicator |
| `StatusPill.astro` | Race cards | 3 variants (open/soldout/express) |
| `InterestModal.astro` | Homepage | Express interest form |
| `Footer.astro` | All pages | Links |
| `ContactForm.astro` | Contact page | |

**CSS cleanup:** Remove unused CSS rules for the old full-page detail layout (`.detail-hero`, `.detail-photos`, `.package-tabs`, `.hotels-grid` grid variant, `.package-grid`, `.detail-body`, `.detail-packages`, `.continue-bar`). Keep only compact checkout flow styles.

**JS behavior:** Vanilla JS in `<script>` blocks and Astro client islands. No framework.

## 9. Deployment (Dokploy)

- **Project name:** "One run" on Dokploy
- **Server:** hetzner-ccx13 (138.199.205.111)
- **Type:** Application (Docker)
- **Build:** `@astrojs/node` SSR adapter, output to standalone Node server
- **Persistence:** Volume mount for `data/onerun.db` and `src/data/uploads/`
- **GitHub key** in dokploy.txt for repo connection

## 10. Edge Cases & Error Handling

- **Stale pending bookings:** Admin can view/manually cancel. No automatic cleanup MVP.
- **Payment timeout:** User closes browser before paying — booking stays `pending`, no email, seats reserved temporarily.
- **Double booking race condition:** SQLite transaction serializes seat checks.
- **Webhook replay:** Idempotency via `revolut_order_id` — if already `paid`, ignore duplicate.
- **File upload limits:** Certificate uploads capped at 10MB, PDF/JPG/PNG only.
- **Admin session expiry:** Session cookie, expires on browser close.
