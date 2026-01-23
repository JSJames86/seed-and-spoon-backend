"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSupabaseClient } from "@/lib/supabaseClientFrontend"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardLoading } from "@/components/dashboard/loading-skeleton"
import { EmptyState, EmptyTableState } from "@/components/dashboard/empty-state"
import { Users as UsersIcon, Calendar, UserPlus } from "lucide-react"

export default function VolunteerDashboard() {
  const [shifts, setShifts] = useState<any[]>([])
  const [myShifts, setMyShifts] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const headers = { Authorization: `Bearer ${session.access_token}` }

    const [shiftsRes, myShiftsRes, groupsRes] = await Promise.all([
      fetch('/api/volunteer/shifts?view=available', { headers }).then(r => r.json()),
      fetch('/api/volunteer/shifts?view=mine', { headers }).then(r => r.json()),
      fetch('/api/volunteer/groups', { headers }).then(r => r.json()),
    ])

    if (shiftsRes.success) setShifts(shiftsRes.data || [])
    if (myShiftsRes.success) setMyShifts(myShiftsRes.data || [])
    if (groupsRes.success) setGroups(groupsRes.data || [])
    setLoading(false)
  }

  if (loading) {
    return <DashboardLoading />
  }

  return (
    <DashboardShell
      title="Volunteer Hub"
      description="View shifts, track hours, and manage group memberships"
      icon={UsersIcon}
    >
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>My Upcoming Shifts</CardDescription>
            <CardTitle className="text-2xl">
              {myShifts.filter(s => s.status === 'registered' || s.status === 'confirmed').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available Shifts</CardDescription>
            <CardTitle className="text-2xl">{shifts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Group Memberships</CardDescription>
            <CardTitle className="text-2xl">{groups.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="available">
        <TabsList>
          <TabsTrigger value="available">Available Shifts</TabsTrigger>
          <TabsTrigger value="my-shifts">My Shifts</TabsTrigger>
          <TabsTrigger value="groups">My Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="available">
          {shifts.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Available Shifts</CardTitle>
                <CardDescription>Open shifts you can sign up for</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Spots</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.map((shift: any) => (
                      <TableRow key={shift.id}>
                        <TableCell className="font-medium">{shift.title || 'Untitled Shift'}</TableCell>
                        <TableCell>{shift.food_banks?.name || shift.location || '-'}</TableCell>
                        <TableCell>{new Date(shift.start_time).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          {shift.max_volunteers
                            ? `${shift.current_volunteers || 0}/${shift.max_volunteers}`
                            : 'Open'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No shifts available right now"
              description="Check back soon for new volunteer opportunities. Shifts are posted regularly as events are scheduled."
            />
          )}
        </TabsContent>

        <TabsContent value="my-shifts">
          {myShifts.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>My Shifts</CardTitle>
                <CardDescription>Shifts you've signed up for</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shift</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myShifts.map((signup: any) => (
                      <TableRow key={signup.id}>
                        <TableCell className="font-medium">{signup.shifts?.title || 'Shift'}</TableCell>
                        <TableCell>
                          {signup.shifts?.start_time
                            ? new Date(signup.shifts.start_time).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={signup.status === 'completed' ? 'default' : 'secondary'}>
                            {signup.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{signup.hours_credited || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No shifts signed up yet"
              description="Browse available shifts and sign up to start tracking your volunteer hours. Your completed shifts and hours will show here."
              action={{ label: "Browse shifts" }}
            />
          )}
        </TabsContent>

        <TabsContent value="groups">
          {groups.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>My Groups</CardTitle>
                <CardDescription>Organizations and groups you volunteer with</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((membership: any) => (
                      <TableRow key={membership.id}>
                        <TableCell className="font-medium">{membership.volunteer_groups?.name}</TableCell>
                        <TableCell>{membership.volunteer_groups?.group_type || '-'}</TableCell>
                        <TableCell><Badge variant="outline">{membership.role}</Badge></TableCell>
                        <TableCell>{new Date(membership.joined_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={UserPlus}
              title="No group memberships"
              description="Volunteer groups allow organizations (schools, churches, companies) to track their member hours together. Ask your group leader for a join code."
              action={{ label: "Join a group" }}
            />
          )}
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
