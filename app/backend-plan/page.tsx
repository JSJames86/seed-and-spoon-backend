"use client"

import { useState } from "react"

const STATUS = {
  done: { label: "Done", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  partial: { label: "Partial", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  missing: { label: "Missing", color: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
} as const

const PRIORITY = {
  P0: "bg-rose-500 text-white",
  P1: "bg-amber-500 text-white",
  P2: "bg-slate-600 text-slate-200",
} as const

type StatusKey = keyof typeof STATUS
type PriorityKey = keyof typeof PRIORITY

interface Module {
  id: string
  name: string
  icon: string
  status: StatusKey
  priority: PriorityKey
  summary: string
  existing: string[]
  gaps: string[]
  todos: string[]
}

const modules: Module[] = [
  {
    id: "structure",
    name: "Repo Structure",
    icon: "📁",
    status: "partial",
    priority: "P0",
    summary:
      "Mixed pages/api + app/ coexistence. No shared middleware layer. shadcn is installed (components.json ✓) but no lib/types.ts or lib/errors.ts.",
    existing: [
      "pages/api/ — directory, donations, maps, admin, volunteer, profile, intakes routes",
      "app/ folder exists alongside pages/ (hybrid routing)",
      "lib/supabaseClient.js + lib/googleMapsClient.js",
      "lib/authMiddleware.js (Phase 2)",
      "components.json — shadcn configured",
      "components/ folder present",
    ],
    gaps: [
      "No shared lib/middleware.ts composing auth + role checks cleanly",
      "app/ vs pages/api/ split is ambiguous — don't mix",
      "No lib/types.ts — shared TypeScript interfaces missing",
      "No lib/errors.ts — error response shape is ad-hoc per route",
      "No lib/validators/ — input validation scattered or absent",
    ],
    todos: [
      "Decide: keep pages/api/ OR migrate to app/api/ — don't run both",
      "Create lib/middleware.ts with withAuth(), withRole('admin'), withServiceToken()",
      "Create lib/types.ts — Volunteer, Donor, FoodBank, Donation interfaces",
      "Create lib/errors.ts — ApiError class + errorResponse() helper",
      "Create lib/validators/ — zod schemas per resource (bun add zod)",
    ],
  },
  {
    id: "auth",
    name: "Auth & RBAC",
    icon: "🔐",
    status: "partial",
    priority: "P0",
    summary:
      "authMiddleware.js exists with requireAdmin/requireStaff/requireAuth. 4 roles defined. Protected /me endpoints exist. Gaps in consistency and service token support.",
    existing: [
      "lib/authMiddleware.js — requireAdmin(), requireStaff(), requireAuth(), optionalAuth()",
      "4 roles: admin, donor, client, volunteer",
      "GET /api/donations/me — donor-scoped",
      "GET /api/intakes/me — client-scoped",
      "GET /api/volunteer/hours — volunteer-scoped",
      "GET/PUT /api/profile/me",
    ],
    gaps: [
      "No service token (ADMIN_SERVICE_TOKEN) for Twenty/CRM → backend calls",
      "Not all /api/admin/* routes confirmed to use requireAdmin()",
      "No rate limiting on auth-sensitive endpoints",
      "No POST endpoint to assign roles — requires raw SQL in Supabase",
    ],
    todos: [
      "Audit every /api/admin/* route — confirm requireAdmin() applied to all",
      "Add withServiceToken() in lib/middleware.ts for Twenty CRM calls",
      "Add rate limiting on /api/donations/create (upstash/ratelimit)",
      "Add POST /api/admin/auth/assign-role — admin sets roles without direct DB",
    ],
  },
  {
    id: "directory",
    name: "Food Bank Directory",
    icon: "📍",
    status: "done",
    priority: "P1",
    summary:
      "Core public API is solid. food_banks, services, operating_hours tables exist with RLS. Geo-proximity search and Google Maps integration complete.",
    existing: [
      "GET /api/directory/food-banks — proximity, county/city filter, directions_url",
      "POST /api/directory/food-banks",
      "GET/POST /api/directory/services",
      "GET/POST/PUT /api/directory/hours",
      "GET /api/maps/nearby — mobile-optimized",
      "GET/POST /api/maps/geocode + GET /api/maps/distance",
      "food_banks, services, operating_hours tables w/ RLS + public read policies",
      "Seed scripts + CSV import for county data",
    ],
    gaps: [
      "No PATCH/DELETE on food_banks — admin can't update or deactivate",
      "No bulk update endpoint for re-imports without full re-seed",
      "Geocode results not cached — repeated Maps API calls cost money",
    ],
    todos: [
      "Add PATCH /api/directory/food-banks/[id]",
      "Add DELETE /api/directory/food-banks/[id] (soft delete: active = false)",
      "Cache geocode results in Supabase to reduce Maps API usage",
    ],
  },
  {
    id: "donations",
    name: "Donations & Stripe",
    icon: "💳",
    status: "partial",
    priority: "P0",
    summary:
      "Core Stripe one-time payment flow done. Webhook handling exists. Missing: subscription tiers, receipt emails, refunds, and idempotency.",
    existing: [
      "POST /api/donations/create — PaymentIntent",
      "GET /api/donations/history — paginated, filterable",
      "GET /api/donations/stats — by period",
      "GET /api/donations/[id]",
      "POST /api/donations/webhook — payment_intent.succeeded/failed",
      "GET /api/donations/me — donor-scoped",
      "donations table w/ stripe_payment_intent_id, amount, status, metadata",
    ],
    gaps: [
      "No subscription/recurring support — meal box tiers not implemented",
      "No product tier differentiation: community meal vs meal box vs youth gardening",
      "No receipt email triggered on successful payment",
      "No idempotency key on PaymentIntent creation",
      "No refund endpoint",
      "donations.donor_email not linked to donors table by FK",
    ],
    todos: [
      "Add STRIPE_PRICE_MEAL_DONATION, STRIPE_PRICE_MEAL_BOX, STRIPE_PRICE_YOUTH_GARDEN to .env",
      "POST /api/donations/subscribe — Stripe Subscription for recurring tiers",
      "Add webhook handlers: customer.subscription.created / cancelled",
      "Trigger Resend receipt email from webhook on payment_intent.succeeded",
      "Add idempotency_key to PaymentIntent creation",
    ],
  },
  {
    id: "volunteers",
    name: "Volunteers",
    icon: "🙋",
    status: "partial",
    priority: "P1",
    summary:
      "Phase 1 CRUD + Phase 2 task/hours tracking with verification workflow are built. Missing: public signup, user_id FK, export for grant reporting.",
    existing: [
      "GET/POST /api/admin/volunteers",
      "GET/PUT/DELETE /api/admin/volunteer?id=",
      "GET/POST/PUT/DELETE /api/admin/volunteer-tasks/[id]",
      "GET/POST/PUT/DELETE /api/admin/volunteer-hours/[id] — with verification",
      "GET /api/volunteer/hours — self-service",
      "volunteer_stats view",
    ],
    gaps: [
      "No public volunteer signup endpoint",
      "volunteers table has no user_id FK to auth.users",
      "No welcome email on registration",
      "No CSV export for IRS/grant reporting",
    ],
    todos: [
      "Add POST /api/public/volunteer/register — public signup, no auth required",
      "Add user_id UUID FK to volunteers table",
      "Send welcome email via Resend on volunteer insert",
      "Add GET /api/admin/volunteers/export?format=csv",
    ],
  },
  {
    id: "donors",
    name: "Donors",
    icon: "💝",
    status: "done",
    priority: "P1",
    summary:
      "Phase 2 built full donor CRM: profiles, donation history, preferences, and stats view. Solid foundation.",
    existing: [
      "GET/POST /api/admin/donors",
      "GET/PUT/DELETE /api/admin/donors/[id] — with donation history",
      "Communication preferences on profile",
      "donor_stats view — lifetime value, frequency, averages",
    ],
    gaps: [
      "donors.user_id not linked to auth.users — email matching only",
      "No recurring subscription status surfaced from Stripe",
      "No CSV export",
    ],
    todos: [
      "Link donors.user_id → auth.users once subscription flow is built",
      "Surface Stripe subscription status on donor profile",
      "GET /api/admin/donors/export for mail merge / grant reporting",
    ],
  },
  {
    id: "events",
    name: "Events & Calendar",
    icon: "📅",
    status: "done",
    priority: "P2",
    summary:
      "Phase 2 built full event management, volunteer registration, and iCal export. Needs public endpoint for frontend.",
    existing: [
      "GET/POST /api/admin/events",
      "GET/PUT/DELETE /api/admin/events/[id]",
      "POST/PUT/DELETE /api/admin/events/[id]/volunteers",
      "GET /api/admin/calendar/ical — iCal feed",
      "GET/POST /api/admin/calendar/sync",
      "Public/private event visibility flag",
    ],
    gaps: [
      "No GET /api/public/events for frontend to list community events",
      "iCal URL is unauthenticated — anyone with URL sees all events",
    ],
    todos: [
      "Add GET /api/public/events — non-private events only",
      "Add signed/expiring iCal URL token",
    ],
  },
  {
    id: "dashboard",
    name: "Admin Dashboard API",
    icon: "📊",
    status: "done",
    priority: "P1",
    summary:
      "Phase 2 built aggregate dashboard stats using Promise.all(). Solid. Missing food bank metrics and board report export.",
    existing: [
      "GET /api/admin/dashboard — aggregate: volunteers, donors, donations, events",
      "Configurable timeframes",
      "Recent activity tracking",
      "Stats views: volunteer_stats, donor_stats, event_stats",
    ],
    gaps: [
      "No food_banks count / directory stats in dashboard",
      "No board report export (PDF/CSV)",
      "No real-time updates — requires polling",
    ],
    todos: [
      "Add food_banks active count to dashboard aggregate",
      "GET /api/admin/reports/monthly — board summary",
      "Phase 3: Supabase Realtime for live updates",
    ],
  },
  {
    id: "spoonassist",
    name: "SpoonAssist (AI)",
    icon: "🥄",
    status: "missing",
    priority: "P1",
    summary:
      "Instacart API access is secured. Zero backend routes built yet. Needs its own table, routes, and AI layer.",
    existing: ["Instacart API access secured", "Mentioned in README future plans"],
    gaps: [
      "No food_pantry_inventory table",
      "No SpoonAssist API routes",
      "No price comparison logic",
      "No AI substitution layer",
    ],
    todos: [
      "Add food_pantry_inventory table: pantry_id, item_name, quantity, updated_at",
      "GET /api/spoonassist/compare?item= — pantry vs Instacart",
      "POST /api/admin/pantry/inventory — staff stock updates",
      "Link pantry_id FK with food_banks table",
      "Add Claude API call for substitution suggestions",
    ],
  },
  {
    id: "emails",
    name: "Emails & Notifications",
    icon: "📧",
    status: "missing",
    priority: "P1",
    summary:
      "emails/templates/ folder and frontend-components/email/ exist but nothing is wired. No email provider configured anywhere.",
    existing: ["emails/templates/ folder", "frontend-components/email/ folder"],
    gaps: [
      "No email provider (Resend recommended for Next.js + Bun)",
      "No lib/email.ts send utility",
      "No donation receipt email",
      "No volunteer/donor welcome email",
      "No task assignment notification",
    ],
    todos: [
      "bun add resend",
      "Create lib/email.ts — sendEmail(to, template, data)",
      "Add RESEND_API_KEY to .env.example",
      "Wire receipt to Stripe webhook payment_intent.succeeded",
      "Wire welcome email to volunteer + donor insert",
    ],
  },
]

type FilterKey = "all" | StatusKey

export default function BackendPlan() {
  const [activeTab, setActiveTab] = useState<"overview" | "modules" | "roadmap">("overview")
  const [selectedModule, setSelectedModule] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>("all")

  const filtered = filter === "all" ? modules : modules.filter((m) => m.status === filter)
  const counts = {
    done: modules.filter((m) => m.status === "done").length,
    partial: modules.filter((m) => m.status === "partial").length,
    missing: modules.filter((m) => m.status === "missing").length,
  }

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-slate-200"
      style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
    >
      {/* Header */}
      <div className="border-b border-slate-800 px-4 py-3 sm:px-6 sm:py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🌱</span>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wider">SEED & SPOON — BACKEND PLAN</h1>
            <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">Next.js · Supabase · Bun · Vercel · shadcn/ui</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            {counts.done} done
          </span>
          <span className="px-2 py-1 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
            {counts.partial} partial
          </span>
          <span className="px-2 py-1 rounded border border-rose-500/30 bg-rose-500/10 text-rose-400">
            {counts.missing} missing
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 px-4 sm:px-6 flex overflow-x-auto">
        {(["overview", "modules", "roadmap"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs uppercase tracking-wide sm:tracking-widest border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "API Routes", value: "40+", sub: "pages/api + app/api" },
                { label: "DB Tables", value: "12", sub: "Phase 1 + 2" },
                { label: "Auth Roles", value: "4", sub: "admin · donor · client · volunteer" },
                { label: "Integrations", value: "3", sub: "Stripe · Maps · Supabase" },
              ].map((c) => (
                <div key={c.label} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{c.value}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{c.label}</div>
                  <div className="text-xs text-slate-600 mt-1">{c.sub}</div>
                </div>
              ))}
            </div>

            <div className="bg-rose-950/30 border border-rose-500/30 rounded-lg p-4">
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-3">
                🚨 Critical Gaps — Fix First
              </h3>
              <div className="space-y-2">
                {[
                  ["Hybrid routing", "app/ and pages/api/ coexist — pick pages/api and remove the ambiguity."],
                  [
                    "No shared middleware",
                    "authMiddleware.js exists but no composable withAuth() used consistently across all routes.",
                  ],
                  [
                    "No email provider",
                    "emails/templates/ exists, nothing is wired. Stripe receipts and welcome emails never fire.",
                  ],
                  ["Stripe tiers missing", "One-time payments work. Meal box subscriptions and recurring tiers are not built."],
                  ["SpoonAssist = zero", "Instacart API secured, but no routes, no table, no logic built yet."],
                ].map(([title, desc]) => (
                  <div key={title} className="flex gap-3 text-sm">
                    <span className="text-rose-500 shrink-0">→</span>
                    <div>
                      <span className="text-rose-300 font-semibold">{title}: </span>
                      <span className="text-slate-400 text-xs">{desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-4">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">
                ✅ What&apos;s Already Solid
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs text-slate-400">
                {[
                  "Food bank directory with geo-proximity search",
                  "Google Maps: nearby, geocode, distance",
                  "Stripe PaymentIntent flow + webhook",
                  "4-role RBAC with Supabase Auth JWT",
                  "Donor CRM (Phase 2) — full CRUD + stats",
                  "Event management + iCal export",
                  "Volunteer task assignment + hours verification",
                  "Admin dashboard aggregate stats",
                  "Bun-only enforcement (npm blocked in CI)",
                  "County-level seed scripts + CSV import",
                ].map((item) => (
                  <div key={item} className="flex gap-2">
                    <span className="text-emerald-500">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">📐 Database Tables</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {[
                  ["food_banks", "core directory", "1"],
                  ["services", "food bank services", "1"],
                  ["operating_hours", "weekly schedule", "1"],
                  ["donations", "stripe payments", "1"],
                  ["volunteers", "volunteer profiles", "1"],
                  ["notes", "polymorphic admin notes", "1"],
                  ["volunteer_tasks", "task assignments", "2"],
                  ["volunteer_hours", "hours + verification", "2"],
                  ["donors", "donor CRM profiles", "2"],
                  ["events", "calendar events", "2"],
                  ["event_volunteers", "registration join", "2"],
                  ["admin_users", "staff/partner roles", "1"],
                ].map(([table, note, phase]) => (
                  <div key={table} className="flex gap-2 bg-slate-800/50 rounded px-2 py-1.5 items-center">
                    <span
                      className={`text-xs px-1 rounded shrink-0 ${
                        phase === "2" ? "bg-blue-500/20 text-blue-400" : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      P{phase}
                    </span>
                    <div>
                      <div className="text-slate-200">{table}</div>
                      <div className="text-slate-600">{note}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-800">
                Missing tables:{" "}
                <span className="text-amber-400">food_pantry_inventory</span> ·{" "}
                <span className="text-amber-400">user_profiles</span> ·{" "}
                <span className="text-amber-400">counties</span> (normalized)
              </p>
            </div>
          </div>
        )}

        {/* Modules Tab */}
        {activeTab === "modules" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["all", "done", "partial", "missing"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs rounded border transition-colors ${
                    filter === f
                      ? "border-slate-400 text-slate-200 bg-slate-700"
                      : "border-slate-700 text-slate-500 hover:border-slate-500"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {filtered.map((mod) => (
              <div key={mod.id} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <button
                  className="w-full text-left p-4 flex items-start gap-3 hover:bg-slate-800/50 transition-colors"
                  onClick={() => setSelectedModule(selectedModule === mod.id ? null : mod.id)}
                >
                  <span className="text-xl shrink-0 mt-0.5">{mod.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{mod.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS[mod.status].color}`}>
                        {STATUS[mod.status].label}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${PRIORITY[mod.priority]}`}>
                        {mod.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{mod.summary}</p>
                  </div>
                  <span className="text-slate-600 text-xs mt-1 shrink-0">
                    {selectedModule === mod.id ? "▲" : "▼"}
                  </span>
                </button>

                {selectedModule === mod.id && (
                  <div className="border-t border-slate-800 p-3 sm:p-4 grid sm:grid-cols-3 divide-y divide-slate-800 sm:divide-y-0 text-xs">
                    <div className="py-3 sm:py-0 sm:pr-4">
                      <h4 className="text-emerald-400 font-bold uppercase tracking-wide mb-2">✓ Exists</h4>
                      <ul className="space-y-1.5">
                        {mod.existing.map((e) => (
                          <li key={e} className="text-slate-400 flex gap-1.5">
                            <span className="text-emerald-600 shrink-0">·</span>
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="py-3 sm:py-0 sm:px-4">
                      <h4 className="text-rose-400 font-bold uppercase tracking-wide mb-2">✗ Gaps</h4>
                      <ul className="space-y-1.5">
                        {mod.gaps.map((g) => (
                          <li key={g} className="text-slate-400 flex gap-1.5">
                            <span className="text-rose-600 shrink-0">·</span>
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="py-3 sm:py-0 sm:pl-4">
                      <h4 className="text-blue-400 font-bold uppercase tracking-wide mb-2">→ Todos</h4>
                      <ul className="space-y-1.5">
                        {mod.todos.map((t) => (
                          <li key={t} className="text-slate-400 flex gap-1.5">
                            <span className="text-blue-600 shrink-0">□</span>
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Roadmap Tab */}
        {activeTab === "roadmap" && (
          <div className="space-y-5">
            {[
              {
                label: "Now — P0 Fixes",
                border: "border-rose-500/40",
                bg: "bg-rose-950/20",
                head: "text-rose-400",
                items: [
                  ["Commit to pages/api/ only — remove app/ hybrid confusion", "1h"],
                  ["Create lib/middleware.ts with composable auth wrappers", "2h"],
                  ["Create lib/types.ts + lib/errors.ts", "1h"],
                  ["Audit all /api/admin/* routes for requireAdmin()", "1h"],
                  ["Add withServiceToken() for Twenty CRM calls", "1h"],
                  ["Add idempotency key to Stripe PaymentIntent creation", "30m"],
                ],
              },
              {
                label: "Next — Email + Stripe Tiers",
                border: "border-amber-500/40",
                bg: "bg-amber-950/20",
                head: "text-amber-400",
                items: [
                  ["bun add resend + create lib/email.ts helper", "1h"],
                  ["Wire receipt email to Stripe webhook", "1h"],
                  ["Wire welcome emails to volunteer/donor insert", "1h"],
                  ["Add 3 Stripe Price IDs to .env + POST /api/donations/subscribe", "4h"],
                  ["Stripe webhook: subscription.created / cancelled handlers", "2h"],
                  ["Add PATCH + DELETE to /api/directory/food-banks/[id]", "1h"],
                ],
              },
              {
                label: "Phase 3 — SpoonAssist + Reporting",
                border: "border-blue-500/40",
                bg: "bg-blue-950/20",
                head: "text-blue-400",
                items: [
                  ["food_pantry_inventory table + migration", "1h"],
                  ["POST /api/admin/pantry/inventory — staff stock updates", "2h"],
                  ["GET /api/spoonassist/compare — pantry vs Instacart price", "4h"],
                  ["Claude API layer for substitution suggestions", "3h"],
                  ["GET /api/public/events — frontend public listing", "1h"],
                  ["POST /api/public/volunteer/register — public signup", "2h"],
                  ["GET /api/admin/volunteers/export?format=csv", "1h"],
                ],
              },
              {
                label: "Future",
                border: "border-slate-700",
                bg: "bg-slate-900",
                head: "text-slate-400",
                items: [
                  ["GET /api/admin/reports/monthly — PDF board summary", "4h"],
                  ["Supabase Realtime for live dashboard", "3h"],
                  ["Rate limiting on auth + donation endpoints", "2h"],
                  ["bun test — automated test suite", "4h"],
                  ["Normalize counties table for multi-county scaling", "2h"],
                ],
              },
            ].map(({ label, border, bg, head, items }) => (
              <div key={label} className={`${bg} border ${border} rounded-lg p-4`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${head} mb-3`}>{label}</h3>
                <div className="space-y-2">
                  {items.map(([task, effort]) => (
                    <div key={task} className="flex justify-between gap-3 text-xs">
                      <div className="flex gap-2 text-slate-400 min-w-0">
                        <span className="text-slate-600 shrink-0">□</span>
                        <span>{task}</span>
                      </div>
                      <span className="text-slate-600 shrink-0 tabular-nums pl-1">{effort}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                🔑 .env Checklist
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs font-mono">
                {[
                  ["NEXT_PUBLIC_SUPABASE_URL", true],
                  ["SUPABASE_SERVICE_ROLE_KEY", true],
                  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", true],
                  ["STRIPE_SECRET_KEY", true],
                  ["STRIPE_WEBHOOK_SECRET", true],
                  ["GOOGLE_MAPS_API_KEY", true],
                  ["ADMIN_SERVICE_TOKEN", false],
                  ["RESEND_API_KEY", false],
                  ["STRIPE_PRICE_MEAL_DONATION", false],
                  ["STRIPE_PRICE_MEAL_BOX", false],
                  ["STRIPE_PRICE_YOUTH_GARDEN", false],
                  ["INSTACART_API_KEY", false],
                ].map(([key, done]) => (
                  <div key={key as string} className="flex gap-2">
                    <span className={done ? "text-emerald-500" : "text-slate-600"}>{done ? "✓" : "□"}</span>
                    <span className={done ? "text-slate-400" : "text-amber-400"}>{key}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
