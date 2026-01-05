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
Public

/api/directory/food-banks – GET: list all food banks

/api/directory/services – GET: list services

/api/directory/hours – GET: operating hours

Donations

/api/donations/webhook – POST: Stripe webhook for recording donations

Admin / Volunteers

/api/admin/volunteers – GET: list volunteers

/api/admin/volunteer – POST: add new volunteer

/api/admin/notes – GET/POST: admin notes

⚠️ Admin routes should eventually have authentication/role checks.

Development

Clone repo

Install dependencies:

npm install


Run locally:

npm run dev


Deploy to Vercel and verify API routes

Principles

Manual-first – all workflows work manually now; future automation can be added with n8n

Youth-centered – fast, intuitive, low-friction public APIs

Lean & cost-effective – optimized for Vercel and Supabase free tiers

Mission-aligned – backend supports feeding youth, managing volunteers, and donations efficiently

Future Plans

Integrate SpoonAssist app API

