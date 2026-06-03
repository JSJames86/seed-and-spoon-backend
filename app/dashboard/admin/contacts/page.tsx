"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabaseClientFrontend"
import { Plus, Pencil, Trash2, X, Check, BookUser } from "lucide-react"

interface Contact {
  id: string
  organization: string | null
  name: string | null
  title: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  category: string | null
  created_at: string
}

type ContactForm = {
  organization: string
  name: string
  title: string
  email: string
  phone: string
  address: string
  notes: string
  category: string
}

const BLANK_FORM: ContactForm = {
  organization: "",
  name: "",
  title: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  category: "",
}

const CATEGORY_SUGGESTIONS = [
  "Higher Education & Research",
  "Funders & Grants",
  "Government & Policy",
  "Community Organizations",
  "Vendors & Services",
  "Media & Press",
]

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ContactForm>(BLANK_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  async function getToken(): Promise<string | null> {
    const supabase = getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch("/api/admin/contacts", { headers })
      const json = await res.json()
      if (json.success) setContacts(json.data || [])
      else setError(json.error || "Failed to load contacts")
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditId(null)
    setForm(BLANK_FORM)
    setShowForm(true)
  }

  function openEdit(c: Contact) {
    setEditId(c.id)
    setForm({
      organization: c.organization ?? "",
      name: c.name ?? "",
      title: c.title ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      address: c.address ?? "",
      notes: c.notes ?? "",
      category: c.category ?? "",
    })
    setShowForm(true)
  }

  function field(key: keyof ContactForm) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value })),
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const token = await getToken()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) headers.Authorization = `Bearer ${token}`
      const url = editId ? `/api/admin/contacts?id=${editId}` : "/api/admin/contacts"
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers,
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        setShowForm(false)
        await load()
      } else {
        setError(json.error || "Save failed")
      }
    } catch {
      setError("Network error")
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    setError(null)
    try {
      const token = await getToken()
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch(`/api/admin/contacts?id=${id}`, { method: "DELETE", headers })
      const json = await res.json()
      if (json.success) {
        setDeleteConfirm(null)
        await load()
      } else {
        setError(json.error || "Delete failed")
      }
    } catch {
      setError("Network error")
    }
  }

  const grouped = contacts.reduce<Record<string, Contact[]>>((acc, c) => {
    const cat = c.category?.trim() || "Uncategorized"
    ;(acc[cat] = acc[cat] || []).push(c)
    return acc
  }, {})
  const sortedCategories = Object.keys(grouped).sort()

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-screen-xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ss-charcoal">Key Contacts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""} &middot; {sortedCategories.length} {sortedCategories.length === 1 ? "category" : "categories"}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ss-orange hover:bg-ss-orange-dark text-white text-sm font-medium transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-36 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : sortedCategories.length === 0 ? (
        <div className="text-center py-24">
          <BookUser className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No contacts yet. Add your first one.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedCategories.map(cat => (
            <section key={cat}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                {cat}
              </h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[860px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-left">
                        {["Organization", "Name", "Title", "Email", "Phone", "Address", "Notes"].map(h => (
                          <th key={h} className="px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                        ))}
                        <th className="w-20" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {grouped[cat].map(c => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-ss-charcoal">{c.organization || "—"}</td>
                          <td className="px-4 py-3">{c.name || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{c.title || "—"}</td>
                          <td className="px-4 py-3">
                            {c.email
                              ? <a href={`mailto:${c.email}`} className="text-ss-green hover:underline whitespace-nowrap">{c.email}</a>
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{c.phone || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate" title={c.address ?? ""}>{c.address || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate" title={c.notes ?? ""}>{c.notes || "—"}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              {deleteConfirm === c.id ? (
                                <>
                                  <button
                                    onClick={() => remove(c.id)}
                                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                                    title="Confirm delete"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => openEdit(c)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-ss-charcoal hover:bg-gray-100 transition"
                                    title="Edit"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(c.id)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-ss-charcoal">
                {editId ? "Edit Contact" : "Add Contact"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  { key: "organization" as const, label: "Organization", span: false },
                  { key: "name" as const, label: "Name", span: false },
                  { key: "title" as const, label: "Title", span: false },
                  { key: "email" as const, label: "Email", span: false, type: "email" },
                  { key: "phone" as const, label: "Phone", span: false, type: "tel" },
                  { key: "address" as const, label: "Address", span: true },
                ]).map(({ key, label, span, type }) => (
                  <div key={key} className={span ? "sm:col-span-2" : ""}>
                    <label className="block text-xs font-medium text-ss-charcoal mb-1">{label}</label>
                    <input
                      type={type || "text"}
                      {...field(key)}
                      className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ss-green/30 focus:border-ss-green transition"
                    />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-ss-charcoal mb-1">Category</label>
                  <input
                    type="text"
                    list="contact-categories"
                    placeholder="Select or type a category"
                    {...field("category")}
                    className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ss-green/30 focus:border-ss-green transition"
                  />
                  <datalist id="contact-categories">
                    {CATEGORY_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-ss-charcoal mb-1">Notes</label>
                  <textarea
                    rows={3}
                    {...field("notes")}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ss-green/30 focus:border-ss-green transition resize-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-ss-orange hover:bg-ss-orange-dark text-white text-sm font-medium transition disabled:opacity-60"
              >
                {saving ? "Saving…" : editId ? "Save Changes" : "Add Contact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
