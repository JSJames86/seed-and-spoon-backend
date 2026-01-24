"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  MapPin,
  Building2,
  Package,
  Users,
  LogOut,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getSupabaseClient } from "@/lib/supabaseClientFrontend"
import { SeedSpoonLogo } from "@/components/seed-spoon-logo"
import { useState } from "react"

const counties = [
  { name: "Essex", href: "/dashboard/counties/essex" },
  { name: "Hudson", href: "/dashboard/counties/hudson" },
  { name: "Union", href: "/dashboard/counties/union" },
  { name: "Bergen", href: "/dashboard/counties/bergen" },
  { name: "Passaic", href: "/dashboard/counties/passaic" },
]

const navItems = [
  { title: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
  { title: "Counties", href: "/dashboard/counties", icon: MapPin, children: counties },
  { title: "Site Partners", href: "/dashboard/sites", icon: Building2 },
  { title: "Inventory", href: "/dashboard/inventory", icon: Package },
  { title: "Volunteers", href: "/dashboard/volunteers", icon: Users },
]

interface SidebarProps {
  userRoles?: string[]
}

export function Sidebar({ userRoles = [] }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [countiesExpanded, setCountiesExpanded] = useState(
    pathname?.startsWith("/dashboard/counties") ?? false
  )

  async function handleSignOut() {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="flex h-full w-[260px] flex-col bg-ss-charcoal relative">
      {/* Brand */}
      <div className="px-5 py-5">
        <SeedSpoonLogo variant="light" size="md" />
        <p className="text-gray-500 text-xs mt-1 ml-[38px]">CRM Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-4 px-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard/admin" && pathname?.startsWith(item.href + "/"))
            const hasChildren = item.children && item.children.length > 0
            const isCountiesItem = item.title === "Counties"

            return (
              <div key={item.href}>
                {/* Nav Item with Inverted Corner Effect */}
                <div className="relative">
                  {/* Top inverted corner */}
                  {isActive && (
                    <div className="absolute -top-3 right-0 w-3 h-3 bg-ss-cream">
                      <div className="absolute inset-0 bg-ss-charcoal rounded-br-xl" />
                    </div>
                  )}

                  {isCountiesItem ? (
                    <button
                      onClick={() => setCountiesExpanded(!countiesExpanded)}
                      className={cn(
                        "flex items-center gap-3 w-full rounded-l-2xl px-4 py-3 text-sm font-medium transition-all",
                        isActive
                          ? "bg-ss-cream text-ss-green rounded-r-none ml-2"
                          : "text-gray-400 hover:text-white"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-ss-green")} />
                      <span className="flex-1 text-left">{item.title}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          countiesExpanded && "rotate-180"
                        )}
                      />
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-l-2xl px-4 py-3 text-sm font-medium transition-all",
                        isActive
                          ? "bg-ss-cream text-ss-green rounded-r-none ml-2"
                          : "text-gray-400 hover:text-white"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-ss-green")} />
                      <span>{item.title}</span>
                    </Link>
                  )}

                  {/* Bottom inverted corner */}
                  {isActive && (
                    <div className="absolute -bottom-3 right-0 w-3 h-3 bg-ss-cream">
                      <div className="absolute inset-0 bg-ss-charcoal rounded-tr-xl" />
                    </div>
                  )}
                </div>

                {/* County Sub-items */}
                {hasChildren && countiesExpanded && (
                  <div className="ml-8 mt-1 space-y-0.5">
                    {item.children!.map((child) => {
                      const isChildActive = pathname === child.href
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                            isChildActive
                              ? "text-ss-green bg-ss-green/10"
                              : "text-gray-500 hover:text-gray-300"
                          )}
                        >
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isChildActive ? "bg-ss-green" : "bg-gray-600"
                          )} />
                          {child.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-800">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </div>
  )
}
