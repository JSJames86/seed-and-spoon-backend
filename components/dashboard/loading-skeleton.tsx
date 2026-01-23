import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-4 w-72 bg-muted rounded" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-7 w-16 bg-muted rounded mt-1" />
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Content skeleton */}
      <Card>
        <CardHeader>
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="h-3 w-56 bg-muted rounded mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-full bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-3 w-24 bg-muted rounded animate-pulse" />
        <div className="h-7 w-16 bg-muted rounded mt-1 animate-pulse" />
      </CardHeader>
    </Card>
  )
}

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-8 w-full bg-muted/50 rounded" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 w-full bg-muted/30 rounded" />
      ))}
    </div>
  )
}
