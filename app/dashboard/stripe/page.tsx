"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

type StripeCustomer = {
  id: string
  email: string | null
  name: string | null
  phone: string | null
  created: number
  currency: string | null
  balance: number
  delinquent: boolean
  description: string | null
}

type StripeSubscription = {
  id: string
  status: string
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  created: number
  customer: {
    id: string
    email?: string
    name?: string
  }
}

export default function StripePage() {
  const [customers, setCustomers] = useState<StripeCustomer[]>([])
  const [subscriptions, setSubscriptions] = useState<StripeSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"customers" | "subscriptions">("customers")

  async function fetchStripeData() {
    setLoading(true)
    setError(null)

    try {
      const [customersRes, subscriptionsRes] = await Promise.all([
        fetch("/api/stripe/customers"),
        fetch("/api/stripe/subscriptions"),
      ])

      const customersData = await customersRes.json()
      const subscriptionsData = await subscriptionsRes.json()

      if (customersData.success) {
        setCustomers(customersData.data.customers || [])
      } else {
        setError(customersData.error?.message || "Failed to fetch customers")
      }

      if (subscriptionsData.success) {
        setSubscriptions(subscriptionsData.data.subscriptions || [])
      }
    } catch (err) {
      setError("Failed to fetch Stripe data")
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchStripeData()
  }, [])

  function formatDate(timestamp: number) {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  function formatCurrency(amount: number) {
    return (amount / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stripe</h1>
          <p className="text-muted-foreground">
            View customer and subscription data from Stripe
          </p>
        </div>
        <Button onClick={fetchStripeData} disabled={loading} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("customers")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "customers"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Customers ({customers.length})
        </button>
        <button
          onClick={() => setActiveTab("subscriptions")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "subscriptions"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Subscriptions ({subscriptions.length})
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : activeTab === "customers" ? (
        <div className="rounded-lg border">
          <div className="border-b bg-muted/40 px-4 py-3">
            <h2 className="font-semibold">Customers</h2>
            <p className="text-sm text-muted-foreground">
              Showing {customers.length} customers from Stripe
            </p>
          </div>

          {customers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No customers found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      {customer.email || "-"}
                    </TableCell>
                    <TableCell>{customer.name || "-"}</TableCell>
                    <TableCell>{formatCurrency(customer.balance)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          customer.delinquent
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {customer.delinquent ? "Delinquent" : "Good Standing"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(customer.created)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="border-b bg-muted/40 px-4 py-3">
            <h2 className="font-semibold">Subscriptions</h2>
            <p className="text-sm text-muted-foreground">
              Showing {subscriptions.length} subscriptions from Stripe
            </p>
          </div>

          {subscriptions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No subscriptions found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period Start</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {sub.customer.email || sub.customer.name || sub.customer.id}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          sub.status === "active"
                            ? "bg-green-100 text-green-700"
                            : sub.status === "canceled"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(sub.current_period_start)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(sub.current_period_end)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(sub.created)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  )
}
