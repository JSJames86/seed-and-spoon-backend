"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSupabaseClient } from "@/lib/supabaseClientFrontend"

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
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Executive Director Dashboard</h1>
        <p className="text-muted-foreground">Full organizational visibility across all operations</p>
      </div>

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
          <Card>
            <CardHeader>
              <CardTitle>Program Overview</CardTitle>
              <CardDescription>
                {programs.length > 0
                  ? "All programs and their enrollment status"
                  : "Programs will appear here once created. Programs track food assistance, education, and community services."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {programs.length > 0 ? (
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
              ) : (
                <p className="text-sm text-muted-foreground">No programs created yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Staff Overview</CardTitle>
              <CardDescription>
                {employees.length > 0
                  ? "Active employees and their departments"
                  : "Employee records will appear here once staff are onboarded through the system."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employees.length > 0 ? (
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
              ) : (
                <p className="text-sm text-muted-foreground">No employees on record.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="governance">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Board Meetings</CardTitle>
              <CardDescription>
                {meetings.length > 0
                  ? "Scheduled board meetings"
                  : "Board meetings will be listed here once scheduled. You can also manage agendas and votes."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {meetings.length > 0 ? (
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
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming meetings.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
