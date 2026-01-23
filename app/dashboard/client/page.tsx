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
import { Home, ClipboardList, AlertTriangle } from "lucide-react"

export default function ClientDashboard() {
  const [household, setHousehold] = useState<any>(null)
  const [programs, setPrograms] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const headers = { Authorization: `Bearer ${session.access_token}` }

    const [householdRes, programsRes, reportsRes] = await Promise.all([
      fetch('/api/client/household', { headers }).then(r => r.json()),
      fetch('/api/client/programs?view=enrolled', { headers }).then(r => r.json()),
      fetch('/api/client/reports', { headers }).then(r => r.json()),
    ])

    if (householdRes.success) setHousehold(householdRes.data)
    if (programsRes.success) setPrograms(programsRes.data || [])
    if (reportsRes.success) setReports(reportsRes.data || [])
    setLoading(false)
  }

  if (loading) {
    return <DashboardLoading />
  }

  // Full empty state: no household means brand new client
  const isNewClient = !household && programs.length === 0

  return (
    <DashboardShell
      title="My Dashboard"
      description="Manage your household, programs, and preferences"
      icon={Home}
    >
      {/* Summary cards - show quick status at a glance */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Household Status</CardDescription>
            <CardTitle className="text-lg">
              {household ? (
                <Badge variant="default">Set up</Badge>
              ) : (
                <Badge variant="secondary">Not set up</Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
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
            <CardDescription>Open Reports</CardDescription>
            <CardTitle className="text-2xl">
              {reports.filter(r => r.status !== 'resolved').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="household">
        <TabsList>
          <TabsTrigger value="household">Household</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="household">
          {household ? (
            <Card>
              <CardHeader>
                <CardTitle>Household Information</CardTitle>
                <CardDescription>Your household details and members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p>{household.name || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Delivery Preference</p>
                      <Badge variant="outline">{household.delivery_preference || 'pickup'}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Address</p>
                      <p>{household.address || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p>{household.phone || 'Not set'}</p>
                    </div>
                  </div>

                  {household.household_members && household.household_members.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Household Members</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Relationship</TableHead>
                            <TableHead>Minor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {household.household_members.map((member: any) => (
                            <TableRow key={member.id}>
                              <TableCell>{member.first_name} {member.last_name}</TableCell>
                              <TableCell>{member.relationship || '-'}</TableCell>
                              <TableCell>
                                {member.is_minor ? <Badge variant="secondary">Under 18</Badge> : 'No'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={Home}
              title="No household set up yet"
              description="Set up your household to access food assistance programs, set delivery preferences, and add family members."
              action={{ label: "Set up household" }}
            />
          )}
        </TabsContent>

        <TabsContent value="programs">
          {programs.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>My Programs</CardTitle>
                <CardDescription>Programs you're enrolled in or have applied to</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enrolled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs.map((enrollment: any) => (
                      <TableRow key={enrollment.id}>
                        <TableCell className="font-medium">{enrollment.programs?.name}</TableCell>
                        <TableCell>{enrollment.programs?.program_type || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'}>
                            {enrollment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{enrollment.enrolled_at ? new Date(enrollment.enrolled_at).toLocaleDateString() : 'Pending'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="No program enrollments yet"
              description="You're not enrolled in any programs yet. Once you set up your household, you can browse and apply to available food assistance programs."
              action={{ label: "Browse programs" }}
            />
          )}
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>My Reports</CardTitle>
              <CardDescription>
                Submit concerns about allergies, safety, service issues, or staff behavior. All reports are reviewed by management.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reports.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report: any) => (
                      <TableRow key={report.id}>
                        <TableCell><Badge variant="outline">{report.report_type}</Badge></TableCell>
                        <TableCell>{report.subject || 'No subject'}</TableCell>
                        <TableCell>
                          <Badge variant={report.status === 'resolved' ? 'default' : 'secondary'}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(report.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyTableState
                  message="No reports submitted."
                  suggestion="If you have a concern (allergy, safety issue, or feedback), you can submit it here."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
