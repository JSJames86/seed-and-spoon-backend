"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDashboardContext } from "@/lib/dashboard-context"
import {
  UtensilsCrossed,
  Building2,
  Users,
  Weight,
  Search,
  CalendarDays,
  Truck,
  Heart,
  TrendingUp,
  Eye,
  Plus,
  Leaf,
  Package,
} from "lucide-react"

type ViewMode = "impact" | "logistics"

// Mock data for demonstration
const mockKPIs = {
  impact: {
    mealsDelivered: 12847,
    activeSites: 23,
    volunteersClocked: 47,
    totalWeight: 28450,
  },
  logistics: {
    trucksActive: 8,
    pendingPickups: 14,
    routesCompleted: 6,
    warehouseCapacity: 72,
  },
}

const countyData = [
  { name: "Essex", delivered: 4200, goal: 5000, percentage: 84 },
  { name: "Hudson", delivered: 3100, goal: 4000, percentage: 78 },
  { name: "Union", delivered: 2800, goal: 3500, percentage: 80 },
  { name: "Bergen", delivered: 1500, goal: 3000, percentage: 50 },
  { name: "Passaic", delivered: 1247, goal: 3500, percentage: 36 },
]

const recentDeliveries = [
  { id: "DEL-001", date: "2026-01-24", site: "Newark Food Bank", county: "Essex", meals: 450, weight: "1,200 lbs", driver: "M. Johnson", status: "delivered" },
  { id: "DEL-002", date: "2026-01-24", site: "Jersey City Pantry", county: "Hudson", meals: 320, weight: "890 lbs", driver: "S. Williams", status: "delivered" },
  { id: "DEL-003", date: "2026-01-24", site: "Elizabeth Kitchen", county: "Union", meals: 275, weight: "720 lbs", driver: "R. Davis", status: "in_transit" },
  { id: "DEL-004", date: "2026-01-23", site: "Hackensack Center", county: "Bergen", meals: 180, weight: "510 lbs", driver: "T. Brown", status: "delivered" },
  { id: "DEL-005", date: "2026-01-23", site: "Paterson Hub", county: "Passaic", meals: 290, weight: "780 lbs", driver: "A. Martinez", status: "delivered" },
  { id: "DEL-006", date: "2026-01-23", site: "Irvington Depot", county: "Essex", meals: 410, weight: "1,100 lbs", driver: "M. Johnson", status: "delivered" },
  { id: "DEL-007", date: "2026-01-22", site: "Bayonne Pantry", county: "Hudson", meals: 195, weight: "520 lbs", driver: "K. Lee", status: "delivered" },
  { id: "DEL-008", date: "2026-01-22", site: "Plainfield Kitchen", county: "Union", meals: 340, weight: "910 lbs", driver: "S. Williams", status: "delivered" },
  { id: "DEL-009", date: "2026-01-22", site: "Teaneck Center", county: "Bergen", meals: 220, weight: "600 lbs", driver: "R. Davis", status: "delivered" },
  { id: "DEL-010", date: "2026-01-21", site: "Clifton Kitchen", county: "Passaic", meals: 165, weight: "440 lbs", driver: "T. Brown", status: "delivered" },
]

const logisticsActivity = [
  { id: "TRK-001", vehicle: "Truck A-12", route: "Essex North", stops: 5, eta: "2:30 PM", load: "92%", status: "active" },
  { id: "TRK-002", vehicle: "Van B-04", route: "Hudson Central", stops: 3, eta: "3:15 PM", load: "78%", status: "active" },
  { id: "TRK-003", vehicle: "Truck A-08", route: "Union South", stops: 4, eta: "1:45 PM", load: "85%", status: "active" },
  { id: "TRK-004", vehicle: "Van B-07", route: "Bergen West", stops: 2, eta: "4:00 PM", load: "64%", status: "pending" },
  { id: "TRK-005", vehicle: "Truck A-15", route: "Passaic East", stops: 6, eta: "2:00 PM", load: "95%", status: "active" },
]

export default function AdminCRMDashboard() {
  const { userName } = useDashboardContext()
  const [viewMode, setViewMode] = useState<ViewMode>("impact")
  const [searchQuery, setSearchQuery] = useState("")

  const kpis = viewMode === "impact" ? mockKPIs.impact : mockKPIs.logistics
  const displayName = userName ? userName.charAt(0).toUpperCase() + userName.slice(1) : "Admin"

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ss-charcoal">
            Welcome back, {displayName}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here is what is happening across your counties today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {/* Status Toggle */}
          <div className="flex items-center bg-white rounded-xl border border-gray-200 p-1">
            <button
              onClick={() => setViewMode("impact")}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                viewMode === "impact"
                  ? "bg-ss-green text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Heart className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Impact
            </button>
            <button
              onClick={() => setViewMode("logistics")}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                viewMode === "logistics"
                  ? "bg-ss-green text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Truck className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Logistics
            </button>
          </div>

          {/* Date */}
          <div className="hidden sm:flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 md:px-4 py-2.5">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <span className="text-xs md:text-sm text-ss-charcoal font-medium">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 w-40 lg:w-48 rounded-xl border-gray-200 bg-white"
            />
          </div>

          {/* Add New */}
          <Button className="bg-ss-orange hover:bg-ss-orange-dark text-white rounded-xl h-9 md:h-10 px-3 md:px-4 text-xs md:text-sm">
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
            Add Record
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      {viewMode === "impact" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="rounded-bento border-white shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Meals Delivered</p>
                  <p className="text-3xl font-bold text-ss-charcoal mt-1">
                    {mockKPIs.impact.mealsDelivered.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-3 h-3 text-ss-green" />
                    <span className="text-xs text-ss-green font-medium">+12% this week</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-ss-green-mid/10 flex items-center justify-center">
                  <UtensilsCrossed className="w-6 h-6 text-ss-green-mid" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-bento border-white shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Active Sites</p>
                  <p className="text-3xl font-bold text-ss-charcoal mt-1">
                    {mockKPIs.impact.activeSites}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-3 h-3 text-ss-green" />
                    <span className="text-xs text-ss-green font-medium">+2 new this month</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-ss-green-mid/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-ss-green-mid" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-bento border-white shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Volunteers Clocked In</p>
                  <p className="text-3xl font-bold text-ss-charcoal mt-1">
                    {mockKPIs.impact.volunteersClocked}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-3 h-3 text-ss-green" />
                    <span className="text-xs text-ss-green font-medium">8 more than avg</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-ss-green-mid/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-ss-green-mid" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-bento border-white shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Weight (lbs)</p>
                  <p className="text-3xl font-bold text-ss-charcoal mt-1">
                    {mockKPIs.impact.totalWeight.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-3 h-3 text-ss-green" />
                    <span className="text-xs text-ss-green font-medium">+8% vs last week</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-ss-green-mid/10 flex items-center justify-center">
                  <Weight className="w-6 h-6 text-ss-green-mid" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="rounded-bento border-white shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Trucks Active</p>
                  <p className="text-3xl font-bold text-ss-charcoal mt-1">
                    {mockKPIs.logistics.trucksActive}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">of 12 total fleet</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-ss-green-mid/10 flex items-center justify-center">
                  <Truck className="w-6 h-6 text-ss-green-mid" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-bento border-white shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Pending Pickups</p>
                  <p className="text-3xl font-bold text-ss-orange mt-1">
                    {mockKPIs.logistics.pendingPickups}
                  </p>
                  <p className="text-xs text-ss-orange mt-2">Needs attention</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-ss-orange/10 flex items-center justify-center">
                  <Package className="w-6 h-6 text-ss-orange" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-bento border-white shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Routes Completed</p>
                  <p className="text-3xl font-bold text-ss-charcoal mt-1">
                    {mockKPIs.logistics.routesCompleted}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">of 10 scheduled today</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-ss-green-mid/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-ss-green-mid" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-bento border-white shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Warehouse Capacity</p>
                  <p className="text-3xl font-bold text-ss-charcoal mt-1">
                    {mockKPIs.logistics.warehouseCapacity}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">3,200 / 4,400 slots</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-ss-green-mid/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-ss-green-mid" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* NJ County View */}
      <Card className="rounded-bento border-white shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-ss-charcoal">NJ County View</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Weekly delivery progress by county</p>
            </div>
            <Badge variant="outline" className="rounded-lg text-xs border-gray-200">
              Week of Jan 20
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {countyData.map((county) => {
            const isOnTrack = county.percentage >= 50
            return (
              <div key={county.name} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 shrink-0">
                    <Leaf className="w-4 h-4 text-ss-green-mid hidden sm:block" />
                    <span className="text-xs sm:text-sm font-semibold text-ss-charcoal">{county.name}</span>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {county.delivered.toLocaleString()} / {county.goal.toLocaleString()} meals
                    </span>
                    <Badge
                      className={`text-xs rounded-lg ${
                        isOnTrack
                          ? "bg-ss-green/10 text-ss-green border-ss-green/20"
                          : "bg-ss-orange/10 text-ss-orange border-ss-orange/20"
                      }`}
                      variant="outline"
                    >
                      {county.percentage}%
                    </Badge>
                  </div>
                </div>
                <Progress
                  value={county.percentage}
                  className="h-2.5 rounded-full bg-gray-100"
                  indicatorClassName={`rounded-full ${isOnTrack ? "bg-ss-green" : "bg-ss-orange"}`}
                />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Recent Activity / Logistics Table */}
      <Card className="rounded-bento border-white shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base md:text-lg font-bold text-ss-charcoal">
                {viewMode === "impact" ? "Recent Deliveries" : "Active Routes"}
              </CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {viewMode === "impact"
                  ? "Most recent food deliveries across all counties"
                  : "Current truck routes and logistics status"}
              </p>
            </div>
            <Button variant="outline" className="rounded-xl text-xs md:text-sm border-gray-200 w-fit">
              <Eye className="w-4 h-4 mr-2" />
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "impact" ? (
            <div className="overflow-x-auto -mx-6 px-6">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow className="border-gray-100">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">ID</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Date</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Site</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">County</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Meals</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Weight</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDeliveries.map((delivery) => (
                  <TableRow key={delivery.id} className="border-gray-50 hover:bg-ss-cream/50">
                    <TableCell className="font-mono text-xs text-muted-foreground">{delivery.id}</TableCell>
                    <TableCell className="text-sm">{delivery.date}</TableCell>
                    <TableCell className="text-sm font-medium text-ss-charcoal">{delivery.site}</TableCell>
                    <TableCell className="text-sm">{delivery.county}</TableCell>
                    <TableCell className="text-sm font-semibold">{delivery.meals}</TableCell>
                    <TableCell className="text-sm">{delivery.weight}</TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs rounded-lg ${
                          delivery.status === "delivered"
                            ? "bg-ss-green/10 text-ss-green border-ss-green/20"
                            : "bg-ss-orange/10 text-ss-orange border-ss-orange/20"
                        }`}
                        variant="outline"
                      >
                        {delivery.status === "delivered" ? "Delivered" : "In Transit"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-ss-green-light hover:text-ss-green hover:bg-ss-green/5 rounded-lg"
                      >
                        View Receipt
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
            <Table className="min-w-[540px]">
              <TableHeader>
                <TableRow className="border-gray-100">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">ID</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Vehicle</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Route</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Stops</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">ETA</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Load</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logisticsActivity.map((route) => (
                  <TableRow key={route.id} className="border-gray-50 hover:bg-ss-cream/50">
                    <TableCell className="font-mono text-xs text-muted-foreground">{route.id}</TableCell>
                    <TableCell className="text-sm font-medium text-ss-charcoal">{route.vehicle}</TableCell>
                    <TableCell className="text-sm">{route.route}</TableCell>
                    <TableCell className="text-sm font-semibold">{route.stops}</TableCell>
                    <TableCell className="text-sm">{route.eta}</TableCell>
                    <TableCell className="text-sm">{route.load}</TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs rounded-lg ${
                          route.status === "active"
                            ? "bg-ss-green/10 text-ss-green border-ss-green/20"
                            : "bg-ss-orange/10 text-ss-orange border-ss-orange/20"
                        }`}
                        variant="outline"
                      >
                        {route.status === "active" ? "Active" : "Pending"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
