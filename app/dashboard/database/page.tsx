"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
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

type FoodBank = {
  id: string
  name: string
  address: string
  city: string | null
  state: string | null
  zip_code: string | null
  phone: string | null
  email: string | null
  active: boolean
  created_at: string
}

export default function DatabasePage() {
  const [foodBanks, setFoodBanks] = useState<FoodBank[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchFoodBanks() {
    setLoading(true)
    setError(null)

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase environment variables not configured")
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      const { data, error: fetchError } = await supabase
        .from("food_banks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

      if (fetchError) {
        setError(fetchError.message)
        setFoodBanks([])
      } else {
        setFoodBanks(data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data")
      setFoodBanks([])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchFoodBanks()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database</h1>
          <p className="text-muted-foreground">
            View data from your Supabase tables
          </p>
        </div>
        <Button onClick={fetchFoodBanks} disabled={loading} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-lg border">
        <div className="border-b bg-muted/40 px-4 py-3">
          <h2 className="font-semibold">Food Banks</h2>
          <p className="text-sm text-muted-foreground">
            Showing up to 50 records from the food_banks table
          </p>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-500">
            Error: {error}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : foodBanks.length === 0 && !error ? (
          <div className="p-8 text-center text-muted-foreground">
            No food banks found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {foodBanks.map((foodBank) => (
                <TableRow key={foodBank.id}>
                  <TableCell className="font-medium">{foodBank.name}</TableCell>
                  <TableCell>{foodBank.city || "-"}</TableCell>
                  <TableCell>{foodBank.state || "-"}</TableCell>
                  <TableCell>{foodBank.phone || "-"}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        foodBank.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {foodBank.active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(foodBank.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
