"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Database,
  CreditCard,
  Users,
  Heart,
  HandHelping,
  Briefcase,
  Gavel,
  Shield,
  Home,
  FileText,
  Calendar,
  ClipboardList
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

// Navigation items organized by role
const roleNavItems: Record<string, { title: string; href: string; icon: any }[]> = {
  admin: [
    { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { title: "CRM Admin", href: "/dashboard/admin", icon: Shield },
    { title: "Database", href: "/dashboard/database", icon: Database },
    { title: "Stripe", href: "/dashboard/stripe", icon: CreditCard },
  ],
  client: [
    { title: "My Dashboard", href: "/dashboard/client", icon: Home },
  ],
  donor: [
    { title: "Donor Dashboard", href: "/dashboard/donor", icon: Heart },
  ],
  volunteer: [
    { title: "Volunteer Hub", href: "/dashboard/volunteer", icon: HandHelping },
  ],
  employee: [
    { title: "Employee Portal", href: "/dashboard/employee", icon: Briefcase },
  ],
  board_member: [
    { title: "Board Portal", href: "/dashboard/board", icon: Gavel },
  ],
  executive_director: [
    { title: "ED Dashboard", href: "/dashboard/director", icon: ClipboardList },
  ],
}

interface SidebarProps {
  userRoles?: string[]
}

export function Sidebar({ userRoles = ['admin'] }: SidebarProps) {
  const pathname = usePathname()

  // Build nav items based on user roles
  const navItems = (() => {
    const items: { title: string; href: string; icon: any }[] = []
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

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/40">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span>Seed & Spoon</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          {userRoles.length > 0
            ? `Roles: ${userRoles.join(', ')}`
            : 'No roles assigned'}
        </p>
      </div>
    </div>
  )
}
