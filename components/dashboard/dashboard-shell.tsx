import { type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface DashboardShellProps {
  title: string
  description: string
  icon?: LucideIcon
  badge?: string
  children: React.ReactNode
}

export function DashboardShell({ title, description, icon: Icon, badge, children }: DashboardShellProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              {badge && <Badge variant="outline">{badge}</Badge>}
            </div>
            <p className="text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}
