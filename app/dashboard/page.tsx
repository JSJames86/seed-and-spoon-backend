import { Database, CreditCard, Users } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Seed & Spoon admin dashboard.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Database</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            View and manage Supabase data including food banks, donations, and volunteers.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Stripe</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            View customer and subscription data from Stripe.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Quick Stats</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Navigate to Database or Stripe sections to view detailed data.
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold">Getting Started</h2>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>Use the sidebar to navigate between sections</li>
          <li>Database section shows data from your Supabase tables</li>
          <li>Stripe section shows customer and payment data</li>
        </ul>
      </div>
    </div>
  )
}
