import { type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
        {action && (
          <Button variant="outline" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

interface EmptyTableStateProps {
  message: string
  suggestion?: string
}

export function EmptyTableState({ message, suggestion }: EmptyTableStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {suggestion && (
        <p className="text-xs text-muted-foreground/70 mt-1">{suggestion}</p>
      )}
    </div>
  )
}
