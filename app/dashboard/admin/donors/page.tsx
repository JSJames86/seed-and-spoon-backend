"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabaseClientFrontend"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Heart, ChevronRight, Plus } from "lucide-react"

interface Donor {
  id: string
  name: string | null
  email: string
  phone: string | null
  donor_type: string
  status: string
  total_donated: number
  created_at: string
  recent_donations: { amount: number; created_at: string }[]
}

function statusColor(status: string) {
  if (status === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (status === "inactive") return "bg-gray-100 text-gray-500 border-gray-200"
  return "bg-amber-50 text-amber-700 border-amber-200"
}

function initials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(" ")
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export default function DonorsListPage() {
  const router = useRouter()
  const [donors, setDonors] = useState<Donor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all")

  useEffect(() => {
    loadDonors()
  }, [])

  async function loadDonors() {
    setLoading(true)
    setError(null)
    try {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push("/"); return }

      const res = await fetch("/api/admin/donors?limit=200&sort=total_donated&order=desc", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      if (json.success) setDonors(json.data || [])
      else setError(json.error || "Failed to load donors")
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const filtered = donors.filter((d) => {
    const matchesFilter = filter === "all" || d.status === filter
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      (d.name?.toLowerCase().includes(q) ?? false) ||
      d.email.toLowerCase().includes(q)
    return matchesFilter && matchesSearch
  })

  const totalGiven = donors.reduce((s, d) => s + (d.total_donated || 0), 0)
  const activeCount = donors.filter((d) => d.status === "active").length

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ss-charcoal">Donors</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {donors.length} donors · ${totalGiven.toLocaleString()} total raised
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ss-orange hover:bg-ss-orange-dark text-white text-sm font-medium transition self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Add Donor
        </button>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Donors", value: donors.length },
          { label: "Active", value: activeCount },
          { label: "Total Raised", value: `$${totalGiven.toLocaleString()}` },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold text-ss-charcoal mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl border-gray-200"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                filter === f
                  ? "bg-ss-charcoal text-white"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table / list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500 text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No donors found</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Donor</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">Total Given</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Last Gift</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((donor) => {
                  const lastGift = donor.recent_donations?.[0]
                  return (
                    <tr
                      key={donor.id}
                      onClick={() => router.push(`/dashboard/admin/donors/${donor.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-ss-green/15 flex items-center justify-center text-xs font-bold text-ss-green-dark shrink-0">
                            {initials(donor.name, donor.email)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-ss-charcoal truncate">{donor.name || "—"}</p>
                            <p className="text-xs text-muted-foreground truncate">{donor.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground capitalize">{donor.donor_type}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor(donor.status)}`}>
                          {donor.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-ss-charcoal">
                        ${(donor.total_donated || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {lastGift
                          ? new Date(lastGift.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="px-3 py-4 text-gray-300">
                        <ChevronRight className="w-4 h-4" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-2">
            {filtered.map((donor) => {
              const lastGift = donor.recent_donations?.[0]
              return (
                <button
                  key={donor.id}
                  onClick={() => router.push(`/dashboard/admin/donors/${donor.id}`)}
                  className="w-full flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 text-left hover:bg-gray-50 transition"
                >
                  <div className="w-9 h-9 rounded-full bg-ss-green/15 flex items-center justify-center text-xs font-bold text-ss-green-dark shrink-0">
                    {initials(donor.name, donor.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-ss-charcoal text-sm truncate">{donor.name || donor.email}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium shrink-0 ${statusColor(donor.status)}`}>
                        {donor.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ${(donor.total_donated || 0).toLocaleString()} total
                      {lastGift && ` · Last ${new Date(lastGift.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
