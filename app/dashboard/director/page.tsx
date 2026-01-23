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
import { ClipboardList, BookOpen, Users, CalendarDays } from "lucide-react"

export default function DirectorDashboard() {
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [programs, setPrograms] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const headers = { Authorization: `Bearer ${session.access_token}` }

    const [statsRes, programsRes, employeesRes, meetingsRes] = await Promise.all([
      fetch('/api/admin/dashboard', { headers }).then(r => r.json()),
      fetch('/api/admin/programs', { headers }).then(r => r.json()),
      fetch('/api/admin/employees?status=active', { headers }).then(r => r.json()),
      fetch('/api/admin/governance/meetings?upcoming=true', { headers }).then(r => r.json()),
    ])

    if (statsRes.success) setDashboardStats(statsRes.data)
    if (programsRes.success) setPrograms(programsRes.data || [])
    if (employeesRes.success) setEmployees(employeesRes.data || [])
    if (meetingsRes.success) setMeetings(meetingsRes.data || [])
    setLoading(false)
  }

  if (loading) {
    return <DashboardLoading />
  }

  return (
    <DashboardShell
      title="Executive Director Dashboard"
      description="Full organizational visibility across all operations"
      icon={ClipboardList}
    >

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Programs</CardDescription>
            <CardTitle className="text-2xl">
              {programs.filter(p => p.status === 'active').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Employees</CardDescription>
            <CardTitle className="text-2xl">{employees.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Volunteers</CardDescription>
            <CardTitle className="text-2xl">
              {dashboardStats?.volunteer_count || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Donations</CardDescription>
            <CardTitle className="text-2xl">
              ${dashboardStats?.total_donations ? Number(dashboardStats.total_donations).toLocaleString() : '0'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="programs">
        <TabsList>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="governance">Governance</TabsTrigger>
        </TabsList>

        <TabsContent value="programs">
          {programs.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Program Overview</CardTitle>
                <CardDescription>All programs and their enrollment status</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Capacity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs.map((program: any) => (
                      <TableRow key={program.id}>
                        <TableCell className="font-medium">{program.name}</TableCell>
                        <TableCell>{program.program_type || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={program.status === 'active' ? 'default' : 'secondary'}>
                            {program.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{program.capacity || 'Unlimited'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="No programs created yet"
              description="Programs track food assistance, education, and community services. Create your first program via CRM Admin to start enrolling clients."
              action={{ label: "Go to CRM Admin" }}
            />
          )}
        </TabsContent>

        <TabsContent value="staff">
          {employees.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Staff Overview</CardTitle>
                <CardDescription>Active employees and their departments</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Hire Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp: any) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.profiles?.email || emp.employee_number}</TableCell>
                        <TableCell>{emp.department || '-'}</TableCell>
                        <TableCell>{emp.position || '-'}</TableCell>
                        <TableCell><Badge variant="outline">{emp.employment_type}</Badge></TableCell>
                        <TableCell>{new Date(emp.hire_date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={Users}
              title="No employees on record"
              description="Employee records will appear here once staff are onboarded through the system. Use CRM Admin to add employees."
              action={{ label: "Go to CRM Admin" }}
            />
          )}
        </TabsContent>

        <TabsContent value="governance">
          {meetings.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Board Meetings</CardTitle>
                <CardDescription>Scheduled board meetings</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Meeting</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Agenda Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meetings.map((meeting: any) => (
                      <TableRow key={meeting.id}>
                        <TableCell className="font-medium">{meeting.title}</TableCell>
                        <TableCell>{meeting.meeting_type}</TableCell>
                        <TableCell>{new Date(meeting.scheduled_at).toLocaleDateString()}</TableCell>
                        <TableCell>{meeting.meeting_agendas?.[0]?.count || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming meetings"
              description="Board meetings will be listed here once scheduled. You can manage agendas, attendance, and votes from here."
            />
          )}
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
