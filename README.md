# seed-and-spoon-backend

> **🚨 CRITICAL: npm is COMPLETELY PROHIBITED**
>
> **This backend actively blocks npm - builds will fail if npm is used.**
>
> **📚 Required Reading:**
> - [BUN_BACKEND_MIGRATION.md](./BUN_BACKEND_MIGRATION.md) - npm prohibition & Bun-only setup
> - [AUTH_ARCHITECTURE.md](./AUTH_ARCHITECTURE.md) - Authentication & role-based access control

The Seed & Spoon backend powers our nonprofit website, enabling youth access to food and resources, managing volunteers and donors, processing donations via Stripe, and providing service data via Supabase & Google Maps. It's built to be lean, reliable, and mission-focused.

## 🔐 Security-First Architecture

This backend implements **hardened security** with multiple layers:

### Authentication & Authorization
- ✅ **4 distinct roles:** Admin, Donor, Client, Volunteer
- ✅ **Zero trust:** All auth verified server-side
- ✅ **Least privilege:** Users can only access their own data
- ✅ **Server-side RBAC:** Using Supabase Auth

### Infrastructure Security
- ✅ **Bun-only package management:** npm actively blocked
- ✅ **Locked Node version:** 18.x (deterministic builds)
- ✅ **npm detection guardrail:** Fails builds if npm detected
- ✅ **Secure lockfile:** `bun.lockb` with checksums

This backend supports three core user experiences:

“I want to help this mission” – volunteers, school groups, and partners.

“I need help from this mission” – youth and community members seeking food or resources.

“I want to give money or resources so more people can be helped” – donors and supporters.

Stack

Next.js API Routes – serverless backend functions deployed on Vercel

Supabase / PostgreSQL – database for directory, CRM, volunteers, and donations

Stripe API – handles donations and payment events

Google Maps API – powers location lookups, directions, and service areas

Folder Structure
/seed-and-spoon-backend
├─ /pages
│    └─ /api
│         ├─ directory/
│         │     ├─ food-banks.js
│         │     ├─ services.js
│         │     └─ hours.js
│         ├─ donations/
│         │     ├─ create.js
│         │     ├─ history.js
│         │     ├─ stats.js
│         │     ├─ [id].js
│         │     └─ webhook.js
│         ├─ maps/
│         │     ├─ nearby.js
│         │     ├─ geocode.js
│         │     └─ distance.js
│         └─ admin/
│               ├─ volunteers.js
│               ├─ volunteer.js
│               └─ notes.js
├─ /lib
│    ├─ supabaseClient.js
│    └─ googleMapsClient.js
├─ /scripts
│    ├─ seed-all-counties.js
│    └─ ...county seed scripts
├─ /data
│    └─ ...county CSV files
├─ package.json
└─ next.config.js

Supabase Tables
Directory / Services

counties – id, name

food_banks – id, name, county_id, address, phone, website, is_active, notes

services – id, food_bank_id, service_type, description

hours – id, food_bank_id, day_of_week, open_time, close_time

Donations

donations – id, stripe_event_id, amount, currency, donor_email, created_at

Volunteers / CRM

admin_users – id, email, role (admin/staff/partner)

volunteers – id, name, age_range, type, contact, availability

volunteer_events – id, food_bank_id, date, role, notes

admin_notes – id, entity_type, entity_id, note, created_by, created_at

Environment Variables

Set these in Vercel:

NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
STRIPE_SECRET_KEY=<stripe_secret_key>
STRIPE_WEBHOOK_SECRET=<stripe_webhook_secret>
GOOGLE_MAPS_API_KEY=<google_maps_api_key>

API Routes

Directory Endpoints (Public)

`GET /api/directory/food-banks`
- List all active food banks with optional proximity filtering
- Query params:
  - `latitude`, `longitude` - User coordinates for proximity search
  - `radius` - Search radius in miles (default: 10)
  - `county` - Filter by county name
  - `city` - Filter by city name
  - `include_directions` - Add Google Maps directions URL (true/false)
- Returns: `{ foodBanks: [...], count: number, filters: {...} }`
- When coordinates provided, results include `distance` in miles and are sorted by proximity

`POST /api/directory/food-banks`
- Create a new food bank entry
- Body: food bank data object
- Returns: `{ foodBank: {...} }`

`GET /api/directory/services`
- List services offered by food banks
- Query params: `food_bank_id`, `service_type` (optional filters)
- Returns: `{ services: [...] }` with food bank details

`POST /api/directory/services`
- Create a new service entry
- Body: service data object
- Returns: `{ service: {...} }`

`GET /api/directory/hours`
- Get operating hours for a food bank
- Query params: `food_bank_id` (required)
- Returns: `{ hours: [...] }`

`POST /api/directory/hours`
- Create operating hours entry
- Body: hours data object
- Returns: `{ hours: {...} }`

`PUT /api/directory/hours`
- Update operating hours
- Body: `{ id, ...updateData }`
- Returns: `{ hours: {...} }`

Donations & Stripe Integration

`POST /api/donations/create`
- Create a new donation payment intent
- Body:
  - `amount` - Donation amount in dollars (required)
  - `currency` - Currency code (default: 'usd')
  - `donor_email` - Donor's email for receipt (required)
  - `donor_name` - Donor's name (optional)
  - `metadata` - Additional data object (optional)
- Returns: `{ client_secret: string, payment_intent_id: string, amount: number, currency: string }`
- Use `client_secret` with Stripe.js on frontend to complete payment

`GET /api/donations/history`
- Retrieve donation history with filters
- Query params:
  - `status` - Filter by status (succeeded, failed, pending)
  - `donor_email` - Filter by donor email
  - `start_date`, `end_date` - Date range filter
  - `limit`, `offset` - Pagination (default: 50, 0)
- Returns: `{ donations: [...], count: number, total: number, summary: {...}, pagination: {...} }`
- Summary includes total_amount, successful_donations, average_donation

`GET /api/donations/stats`
- Get donation statistics and analytics
- Query params:
  - `period` - Time period: 'today', 'week', 'month', 'year', 'all' (default: 'all')
- Returns comprehensive stats:
  - Total donations, successful/failed/pending counts
  - Total amount raised, average donation, largest donation
  - Unique donor count, success rate
  - Breakdown by currency

`GET /api/donations/[id]`
- Retrieve a specific donation by payment intent ID
- Returns donation details from database + latest Stripe status
- Fallback to Stripe if not found in database

`POST /api/donations/webhook`
- Stripe webhook endpoint for payment events
- Automatically logs successful and failed donations to Supabase
- Events handled: `payment_intent.succeeded`, `payment_intent.payment_failed`
- Configure in Stripe Dashboard:
  - Webhook URL: `https://your-domain.vercel.app/api/donations/webhook`
  - Events: payment_intent.succeeded, payment_intent.payment_failed

Admin / Volunteers

`GET /api/admin/volunteers`
- List volunteers with pagination
- Query params: `status`, `food_bank_id`, `limit`, `offset`
- Returns: `{ volunteers: [...], total: number }`

`POST /api/admin/volunteers`
- Create a new volunteer record
- Body: volunteer data object
- Returns: `{ volunteer: {...} }`

`GET /api/admin/volunteer?id={id}`
- Get single volunteer details
- Returns: `{ volunteer: {...} }` with food bank details

`PUT /api/admin/volunteer?id={id}`
- Update volunteer record
- Body: update data object
- Returns: `{ volunteer: {...} }`

`DELETE /api/admin/volunteer?id={id}`
- Delete volunteer record
- Returns: `{ message: "Volunteer deleted successfully" }`

`GET /api/admin/notes`
- List admin notes
- Query params: `resource_type`, `resource_id`, `limit`, `offset`
- Returns: `{ notes: [...], total: number }`

`POST /api/admin/notes`
- Create a new note
- Body: `{ resource_type, resource_id, content, ... }`
- Returns: `{ note: {...} }`

`PUT /api/admin/notes`
- Update existing note
- Body: `{ id, ...updateData }`
- Returns: `{ note: {...} }`

`DELETE /api/admin/notes?id={id}`
- Delete a note
- Returns: `{ message: "Note deleted successfully" }`

## 🔐 Protected Routes (Authentication Required)

All admin and user-specific routes are protected with **Supabase Auth** and **role-based access control (RBAC)**.

See **[AUTH_ARCHITECTURE.md](./AUTH_ARCHITECTURE.md)** for complete details.

### Donor Routes (Role: `donor`)

`GET /api/donations/me`
- Get authenticated donor's donation history
- Automatically filtered to the logged-in donor's email
- Returns: `{ success: true, data: { donations: [...], summary: {...}, pagination: {...} } }`
- **Security:** Donors can ONLY view their own donations

### Client Routes (Role: `client`)

`GET /api/intakes/me`
- Get authenticated client's intake/application data
- Returns: `{ success: true, data: { intakes: [...], services: [...], profile: {...} } }`
- **Security:** Clients can ONLY view their own intake records

### Volunteer Routes (Role: `volunteer`)

`GET /api/volunteer/hours`
- Get authenticated volunteer's logged hours, tasks, and stats
- Query params: `start_date`, `end_date`, `limit`, `offset`
- Returns: `{ success: true, data: { volunteer: {...}, hours: [...], tasks: [...], stats: {...} } }`
- **Security:** Volunteers can ONLY view their own hours

### Any Authenticated User

`GET /api/profile/me`
- Get the authenticated user's profile
- Returns: `{ success: true, data: { profile: {...}, user: {...} } }`

`PUT /api/profile/me`
- Update the authenticated user's profile
- Body: `{ name, phone, address, preferences }`
- **Note:** Users cannot change their own role
- Returns: `{ success: true, data: { profile: {...} }, message: "Profile updated successfully" }`

### Authentication Headers

All protected routes require a valid Supabase JWT token:

```http
Authorization: Bearer <your-supabase-jwt-token>
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - User does not have required role

Google Maps Integration

`GET /api/maps/nearby`
- Find food banks near a location (optimized for mobile/map view)
- Query params:
  - `latitude`, `longitude` - User location (required)
  - `radius` - Search radius in miles (default: 5)
  - `limit` - Max results to return (default: 10)
  - `include_map` - Include static map URL (true/false)
- Returns: `{ location: {...}, radius_miles: number, count: number, food_banks: [...], map_url?: string }`
- Each food bank includes `distance` in miles and `directions_url`

`GET /api/maps/geocode`
- Convert address to coordinates
- Query param: `address` - Full address string
- Returns: `{ address: string, coordinates: { latitude: number, longitude: number } }`

`POST /api/maps/geocode`
- Convert address to coordinates (alternative method)
- Body: `{ address: string }`
- Returns: `{ address: string, coordinates: { latitude: number, longitude: number } }`

`GET /api/maps/distance`
- Calculate distance between two points
- Query params: `lat1`, `lng1`, `lat2`, `lng2`
- Returns: `{ distance_miles: number, distance_km: number, origin: {...}, destination: {...} }`

## Development

### Prerequisites

**You MUST have Bun installed** (npm is not allowed):

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
```

### Setup

Clone repo:

```bash
git clone https://github.com/JSJames86/seed-and-spoon-backend.git
cd seed-and-spoon-backend
```

Install dependencies:

```bash
# ✅ USE BUN (required)
bun install

# ❌ DO NOT use npm
# npm install  <- THIS WILL FAIL
```

Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys.

Run locally:

```bash
bun run dev
```

The API will be available at `http://localhost:3000/api`

### 📚 Important Documentation

- **[BUN_BACKEND_MIGRATION.md](./BUN_BACKEND_MIGRATION.md)** - **READ THIS FIRST** - npm prohibition & security
- **[AUTH_ARCHITECTURE.md](./AUTH_ARCHITECTURE.md)** - Authentication & role-based access control

### ⚠️ npm Detection

This repository includes an active npm guardrail. If you attempt to use npm:

```bash
$ npm install
❌ ERROR: npm is PROHIBITED in this repository
   See BUN_BACKEND_MIGRATION.md
   [Build fails]
```

Import Food Bank Data

After setting up your database, you'll want to import your food bank data.

Method 1: CSV Import (Recommended)

1. Export your Google Sheet as CSV (File → Download → CSV)
2. Save it in the `data/` folder
3. Run the import script:
   ```bash
   bun run import:csv data/your-food-banks.csv
   ```

Method 2: Direct Supabase Import

1. Go to your Supabase project → Table Editor → food_banks
2. Click "Insert" → "Import data from CSV"
3. Upload your CSV file and map columns

Method 3: Using the Seed Script

1. Edit `scripts/seed-database.js` with your data
2. Run:
   ```bash
   bun run seed
   ```

See `DATA_IMPORT_GUIDE.md` for detailed instructions and column mapping.

Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy
5. Configure Stripe webhook URL in Stripe dashboard:
   - Webhook URL: `https://your-domain.vercel.app/api/donations/webhook`
   - Events to listen for: `payment_intent.succeeded`, `payment_intent.payment_failed`

Test API routes:

```bash
# Test food banks endpoint
curl https://your-domain.vercel.app/api/directory/food-banks

# Test services endpoint
curl https://your-domain.vercel.app/api/directory/services

# Test volunteers endpoint
curl https://your-domain.vercel.app/api/admin/volunteers
```

Principles

Manual-first – all workflows work manually now; future automation can be added with n8n

Youth-centered – fast, intuitive, low-friction public APIs

Lean & cost-effective – optimized for Vercel and Supabase free tiers

Mission-aligned – backend supports feeding youth, managing volunteers, and donations efficiently

## Phase 2: Admin Dashboard & CRM (✅ COMPLETED)

Phase 2 adds comprehensive admin features, volunteer management, donor tracking, and calendar integration.

**New Features:**
- 📊 Admin Dashboard with real-time statistics
- 👥 Volunteer task assignment and hours tracking
- 💰 Donor management and donation history
- 📅 Event calendar with Google/Apple Calendar sync
- 🔐 Role-based authentication and authorization

**Documentation:**
- See [PHASE2_README.md](./PHASE2_README.md) for feature overview
- See [PHASE2_API_TESTING.md](./PHASE2_API_TESTING.md) for testing guide
- See [migrations/002_phase2_tables.sql](./migrations/002_phase2_tables.sql) for database schema

**Quick Start:**
1. Run Phase 2 migration in Supabase
2. Set up admin users with proper roles
3. Test endpoints with authentication tokens

Future Plans

Integrate SpoonAssist app API

