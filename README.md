# seed-and-spoon-backend
The Seed & Spoon backend powers our nonprofit website, enabling youth access to food and resources, managing volunteers and donors, processing donations via Stripe, and providing service data via Supabase & Google Maps. It’s built to be lean, reliable, and mission-focused.

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
│         │     └─ webhook.js
│         └─ admin/
│               ├─ volunteers.js
│               ├─ volunteer.js
│               └─ notes.js
├─ /lib
│    └─ supabaseClient.js
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
- List all active food banks
- Query params: `latitude`, `longitude`, `radius` (optional, for proximity filtering)
- Returns: `{ foodBanks: [...] }`

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

Donations

`POST /api/donations/webhook`
- Stripe webhook endpoint for payment events
- Automatically logs successful and failed donations to Supabase
- Events handled: `payment_intent.succeeded`, `payment_intent.payment_failed`

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

⚠️ Admin routes should eventually have authentication/role checks.

Development

Clone repo:

```bash
git clone https://github.com/JSJames86/seed-and-spoon-backend.git
cd seed-and-spoon-backend
```

Install dependencies:

```bash
npm install
```

Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys.

Run locally:

```bash
npm run dev
```

The API will be available at `http://localhost:3000/api`

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

Future Plans

Integrate SpoonAssist app API

