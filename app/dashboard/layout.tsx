"use client"

import { Sidebar } from "@/components/sidebar"
import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabaseClientFrontend"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [userRoles, setUserRoles] = useState<string[]>([])

  useEffect(() => {
    async function loadRoles() {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.access_token) {
        try {
          const res = await fetch('/api/profile/roles', {
            headers: { Authorization: `Bearer ${session.access_token}` }
          })
          const json = await res.json()
          if (json.success && json.data?.roles) {
            setUserRoles(json.data.roles.map((r: any) => r.name))
          }
        } catch {
          // Fallback to profile role if roles endpoint not available
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

          if (profile?.role) {
            setUserRoles([profile.role])
          }
        }
      }
    }
    loadRoles()
  }, [])

  return (
    <div className="flex h-screen">
      <Sidebar userRoles={userRoles} />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}
