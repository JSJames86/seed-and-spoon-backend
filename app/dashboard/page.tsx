"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { WelcomeHeader, GettingStarted } from "@/components/dashboard/welcome-header"
import { DashboardLoading } from "@/components/dashboard/loading-skeleton"
import { ROLE_CONFIG, getPrimaryRole, type UserRole } from "@/lib/dashboard-config"
import { useDashboardContext } from "@/lib/dashboard-context"
import { ArrowRight, LayoutDashboard } from "lucide-react"

export default function DashboardPage() {
  const { userRoles, userName, isLoading } = useDashboardContext()

  if (isLoading) {
    return <DashboardLoading />
  }

  const primaryRole = getPrimaryRole(userRoles)

  // No roles assigned - show guidance
  if (userRoles.length === 0) {
    return (
      <DashboardShell
        title="Welcome to Seed & Spoon"
        description="Your account is set up, but no roles have been assigned yet."
        icon={LayoutDashboard}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="rounded-full bg-muted p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <LayoutDashboard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No roles assigned</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                A staff member needs to assign you a role before you can access dashboard features.
                If you just signed up, this typically happens within one business day.
              </p>
            </div>
          </CardContent>
        </Card>
      </DashboardShell>
    )
  }

  // Single role - show focused getting started
  if (userRoles.length === 1 && primaryRole) {
    const config = ROLE_CONFIG[primaryRole]
    return (
      <DashboardShell
        title={`Welcome${userName ? `, ${userName}` : ''}`}
        description={config.welcomeMessage}
        icon={config.icon}
        badge={config.label}
      >
        <WelcomeHeader role={primaryRole} isFirstLogin={true} userName={userName || undefined} />
        <GettingStarted role={primaryRole} />

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Go to your dashboard</p>
                <p className="text-sm text-muted-foreground">Access your full {config.label.toLowerCase()} tools and data</p>
              </div>
              <Link href={config.href}>
                <Button>
                  Open {config.label} Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </DashboardShell>
    )
  }

  // Multiple roles - show role selector overview
  return (
    <DashboardShell
      title={`Welcome${userName ? `, ${userName}` : ''}`}
      description="You have access to multiple areas of Seed & Spoon. Choose where to start."
      icon={LayoutDashboard}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {userRoles.map((role) => {
          const config = ROLE_CONFIG[role as UserRole]
          if (!config) return null
          const Icon = config.icon
          return (
            <Link key={role} href={config.href}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-base">{config.label}</CardTitle>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{config.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </DashboardShell>
  )
}
