"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSupabaseClient } from "@/lib/supabaseClientFrontend"

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
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
        <p className="text-muted-foreground">Manage your household, programs, and preferences</p>
      </div>

      <Tabs defaultValue="household">
        <TabsList>
          <TabsTrigger value="household">Household</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="household">
          <Card>
            <CardHeader>
              <CardTitle>Household Information</CardTitle>
              <CardDescription>
                {household
                  ? "Your household details and members"
                  : "You haven't set up your household yet. Add your household to get started with services."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {household ? (
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
              ) : (
                <p className="text-sm text-muted-foreground">
                  Set up your household to access food assistance programs, set delivery preferences, and add family members.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs">
          <Card>
            <CardHeader>
              <CardTitle>My Programs</CardTitle>
              <CardDescription>
                {programs.length > 0
                  ? "Programs you're enrolled in or have applied to"
                  : "You're not enrolled in any programs yet. Browse available programs to apply."}
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
              ) : (
                <p className="text-sm text-muted-foreground">
                  Once you apply to a program, you'll see your enrollment status here.
                </p>
              )}
            </CardContent>
          </Card>
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
                <p className="text-sm text-muted-foreground">
                  No reports submitted. If you have a concern (allergy, safety issue, or feedback), you can submit it here.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
