"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Database,
  CreditCard,
  Users,
  Heart,
  Briefcase,
  Gavel,
  Shield,
  Home,
  ClipboardList,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ROLE_CONFIG, type UserRole } from "@/lib/dashboard-config"
import { getSupabaseClient } from "@/lib/supabaseClientFrontend"

// Navigation items organized by role
const roleNavItems: Record<string, { title: string; href: string; icon: any; description?: string }[]> = {
  admin: [
    { title: "Overview", href: "/dashboard", icon: LayoutDashboard, description: "System overview" },
    { title: "CRM Admin", href: "/dashboard/admin", icon: Shield, description: "Manage roles, programs, staff" },
    { title: "Database", href: "/dashboard/database", icon: Database, description: "View Supabase data" },
    { title: "Stripe", href: "/dashboard/stripe", icon: CreditCard, description: "Payment data" },
  ],
  client: [
    { title: "My Dashboard", href: "/dashboard/client", icon: Home, description: "Household & programs" },
  ],
  donor: [
    { title: "Donor Dashboard", href: "/dashboard/donor", icon: Heart, description: "Donations & impact" },
  ],
  volunteer: [
    { title: "Volunteer Hub", href: "/dashboard/volunteer", icon: Users, description: "Shifts & hours" },
  ],
  employee: [
    { title: "Employee Portal", href: "/dashboard/employee", icon: Briefcase, description: "Schedule & trainings" },
  ],
  board_member: [
    { title: "Board Portal", href: "/dashboard/board", icon: Gavel, description: "Meetings & governance" },
  ],
  executive_director: [
    { title: "ED Dashboard", href: "/dashboard/director", icon: ClipboardList, description: "Org oversight" },
  ],
}

interface SidebarProps {
  userRoles?: string[]
}

export function Sidebar({ userRoles = [] }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Build nav items based on user roles
  const navItems = (() => {
    const items: { title: string; href: string; icon: any; description?: string }[] = []
    const seen = new Set<string>()

    for (const role of userRoles) {
      const roleItems = roleNavItems[role] || []
      for (const item of roleItems) {
        if (!seen.has(item.href)) {
          seen.add(item.href)
          items.push(item)
        }
      }
    }

    // If no roles matched, show default overview
    if (items.length === 0) {
      items.push({ title: "Overview", href: "/dashboard", icon: LayoutDashboard })
    }

    return items
  })()

  const hasMultipleRoles = userRoles.length > 1

  async function handleSignOut() {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/40">
      {/* Brand */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span>Seed & Spoon</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-auto p-3">
        {hasMultipleRoles ? (
          <div className="space-y-4">
            {userRoles.map((role) => {
              const items = roleNavItems[role] || []
              if (items.length === 0) return null
              const config = ROLE_CONFIG[role as UserRole]
              return (
                <div key={role}>
                  <p className="px-3 mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {config?.label || role}
                  </p>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const isActive = pathname === item.href || (pathname?.startsWith(item.href + "/") ?? false)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (pathname?.startsWith(item.href + "/") ?? false)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">{item.title}</span>
                    {item.description && !isActive && (
                      <span className="text-xs text-muted-foreground/70 truncate block">{item.description}</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t p-3 space-y-2">
        {userRoles.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {userRoles.map((role) => (
              <Badge key={role} variant="secondary" className="text-[10px] px-1.5 py-0">
                {ROLE_CONFIG[role as UserRole]?.label || role}
              </Badge>
            ))}
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}
