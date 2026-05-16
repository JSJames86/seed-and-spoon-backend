"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabaseClientFrontend"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Hash,
  CalendarDays,
  TrendingUp,
  Pencil,
  Check,
  X,
  AlertCircle,
} from "lucide-react"

interface Donation {
  id: string
  amount: string | number
  status: string
  donation_type?: string
  created_at: string
  stripe_payment_intent_id?: string
}

interface DonorStats {
  total_donated: string
  donation_count: number
  average_donation: string
  first_donation: string | null
  last_donation: string | null
}

interface Donor {
  id: string
  name: string | null
  email: string
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  donor_type: string
  status: string
  preferred_contact_method: string | null
  communication_preferences: Record<string, boolean> | null
  tax_id: string | null
  notes: string | null
  created_at: string
  donations: Donation[]
  statistics: DonorStats
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

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    inactive: "bg-gray-100 text-gray-500 border-gray-200",
    lapsed: "bg-amber-50 text-amber-700 border-amber-200",
  }
  return map[status] ?? "bg-gray-100 text-gray-500 border-gray-200"
}

function donationStatusDot(status: string) {
  if (status === "succeeded") return "bg-emerald-400"
  if (status === "failed") return "bg-red-400"
  return "bg-amber-400"
}

function fmt(date: string | null) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function fmtAmount(v: string | number) {
  return `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export default function DonorRecordPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [donor, setDonor] = useState<Donor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Donor>>({})

  useEffect(() => {
    loadDonor()
  }, [id])

  async function getAuthHeaders() {
    const supabase = getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push("/"); return null }
    return { Authorization: `Bearer ${session.access_token}` }
  }

  async function loadDonor() {
    setLoading(true)
    setError(null)
    const headers = await getAuthHeaders()
    if (!headers) return
    try {
      const res = await fetch(`/api/admin/donors/${id}`, { headers })
      const json = await res.json()
      if (json.success) {
        setDonor(json.data)
        setForm(json.data)
      } else {
        setError(json.error || "Failed to load donor")
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const headers = await getAuthHeaders()
    if (!headers) return
    try {
      const res = await fetch(`/api/admin/donors/${id}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          zip_code: form.zip_code,
          donor_type: form.donor_type,
          status: form.status,
          preferred_contact_method: form.preferred_contact_method,
          tax_id: form.tax_id,
          notes: form.notes,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setDonor((prev) => prev ? { ...prev, ...json.data } : prev)
        setEditing(false)
      } else {
        setSaveError(json.error || "Save failed")
      }
    } catch {
      setSaveError("Network error")
    } finally {
      setSaving(false)
    }
  }

  function cancelEdit() {
    setForm(donor ?? {})
    setSaveError(null)
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <div className="h-8 w-32 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="grid sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (error || !donor) {
    return (
      <div className="p-6 max-w-5xl mx-auto flex flex-col items-center gap-4 py-20">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-muted-foreground">{error ?? "Donor not found"}</p>
        <button onClick={() => router.back()} className="text-sm text-ss-green underline">Go back</button>
      </div>
    )
  }

  const { statistics: stats, donations } = donor

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">

      {/* Back link */}
      <button
        onClick={() => router.push("/dashboard/admin/donors")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ss-charcoal transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Donors
      </button>

      {/* Donor header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-ss-green/15 flex items-center justify-center text-lg font-bold text-ss-green-dark shrink-0">
            {initials(donor.name, donor.email)}
          </div>
          <div>
            {editing ? (
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="h-9 text-base font-semibold rounded-lg border-gray-200 mb-1 max-w-xs"
                placeholder="Full name"
              />
            ) : (
              <h1 className="text-xl font-bold text-ss-charcoal">{donor.name || <span className="text-gray-400 font-normal">No name</span>}</h1>
            )}
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              {donor.email}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {editing ? (
                <>
                  <select
                    value={form.status ?? "active"}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="text-xs rounded-lg border border-gray-200 px-2 py-1 text-ss-charcoal"
                  >
                    {["active", "inactive", "lapsed"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <select
                    value={form.donor_type ?? "individual"}
                    onChange={(e) => setForm((f) => ({ ...f, donor_type: e.target.value }))}
                    className="text-xs rounded-lg border border-gray-200 px-2 py-1 text-ss-charcoal"
                  >
                    {["individual", "corporate", "foundation", "government"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </>
              ) : (
                <>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusBadge(donor.status)}`}>
                    {donor.status}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-500 capitalize">
                    {donor.donor_type}
                  </span>
                  <span className="text-xs text-muted-foreground">· Since {fmt(donor.created_at)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Edit / Save / Cancel */}
        <div className="flex items-center gap-2 self-start">
          {editing ? (
            <>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ss-green hover:bg-ss-green-dark text-white text-sm font-medium transition disabled:opacity-60"
              >
                <Check className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>
      </div>

      {saveError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {saveError}
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: DollarSign, label: "Total Given", value: fmtAmount(stats.total_donated) },
          { icon: Hash, label: "Donations", value: stats.donation_count },
          { icon: TrendingUp, label: "Average Gift", value: fmtAmount(stats.average_donation) },
          { icon: CalendarDays, label: "Last Gift", value: fmt(stats.last_donation) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Icon className="w-3.5 h-3.5" />
              <span className="text-xs">{label}</span>
            </div>
            <p className="text-lg font-bold text-ss-charcoal">{value}</p>
          </div>
        ))}
      </div>

      {/* Main two-column layout */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Donation history — takes 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-ss-charcoal">Donation History</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{donations.length} transactions</p>
          </div>
          {donations.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No donations yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">Amount</th>
                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="hidden sm:table-cell px-5 py-3 text-xs font-medium text-muted-foreground">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {donations.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-muted-foreground">{fmt(d.created_at)}</td>
                      <td className="px-5 py-3.5 font-semibold text-ss-charcoal text-right">{fmtAmount(d.amount)}</td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${donationStatusDot(d.status)}`} />
                          <span className="capitalize text-muted-foreground">{d.status}</span>
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-5 py-3.5 text-muted-foreground capitalize">
                        {d.donation_type ?? "one-time"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Contact details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-ss-charcoal">Contact Details</h2>

            <div className="space-y-3">
              {/* Phone */}
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                {editing ? (
                  <Input
                    value={form.phone ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="mt-1 h-9 rounded-lg border-gray-200 text-sm"
                    placeholder="(555) 000-0000"
                  />
                ) : (
                  <p className="flex items-center gap-1.5 text-sm text-ss-charcoal mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {donor.phone || <span className="text-gray-400">—</span>}
                  </p>
                )}
              </div>

              {/* Address */}
              <div>
                <Label className="text-xs text-muted-foreground">Address</Label>
                {editing ? (
                  <div className="mt-1 space-y-1.5">
                    <Input
                      value={form.address ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      className="h-9 rounded-lg border-gray-200 text-sm"
                      placeholder="Street address"
                    />
                    <div className="flex gap-1.5">
                      <Input
                        value={form.city ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                        className="h-9 rounded-lg border-gray-200 text-sm flex-1"
                        placeholder="City"
                      />
                      <Input
                        value={form.state ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                        className="h-9 rounded-lg border-gray-200 text-sm w-16"
                        placeholder="ST"
                        maxLength={2}
                      />
                      <Input
                        value={form.zip_code ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, zip_code: e.target.value }))}
                        className="h-9 rounded-lg border-gray-200 text-sm w-20"
                        placeholder="ZIP"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="flex items-start gap-1.5 text-sm text-ss-charcoal mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    {donor.address
                      ? <span>{donor.address}<br />{[donor.city, donor.state, donor.zip_code].filter(Boolean).join(", ")}</span>
                      : <span className="text-gray-400">—</span>}
                  </p>
                )}
              </div>

              {/* Preferred contact */}
              <div>
                <Label className="text-xs text-muted-foreground">Preferred Contact</Label>
                {editing ? (
                  <select
                    value={form.preferred_contact_method ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, preferred_contact_method: e.target.value }))}
                    className="mt-1 w-full text-sm rounded-lg border border-gray-200 px-2 py-1.5 text-ss-charcoal"
                  >
                    <option value="">Not specified</option>
                    {["email", "phone", "mail"].map((m) => <option key={m}>{m}</option>)}
                  </select>
                ) : (
                  <p className="text-sm text-ss-charcoal mt-0.5 capitalize">
                    {donor.preferred_contact_method || <span className="text-gray-400">Not specified</span>}
                  </p>
                )}
              </div>

              {/* Tax ID */}
              <div>
                <Label className="text-xs text-muted-foreground">Tax ID</Label>
                {editing ? (
                  <Input
                    value={form.tax_id ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, tax_id: e.target.value }))}
                    className="mt-1 h-9 rounded-lg border-gray-200 text-sm"
                    placeholder="EIN / SSN"
                  />
                ) : (
                  <p className="text-sm text-ss-charcoal mt-0.5 font-mono">
                    {donor.tax_id || <span className="text-gray-400 font-sans">—</span>}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-ss-charcoal mb-3">Notes</h2>
            {editing ? (
              <textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={4}
                className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 resize-none focus:outline-none focus:border-ss-green focus:ring-1 focus:ring-ss-green transition"
                placeholder="Add internal notes about this donor…"
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {donor.notes || <span className="italic text-gray-300">No notes</span>}
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
