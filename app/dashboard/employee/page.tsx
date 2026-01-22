"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSupabaseClient } from "@/lib/supabaseClientFrontend"

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function EmployeeDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const headers = { Authorization: `Bearer ${session.access_token}` }
    const res = await fetch('/api/employee/me', { headers })
    const json = await res.json()

    if (json.success) setData(json.data)
    setLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div>
  }

  if (!data?.employee) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Employee Portal</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              No employee record found. If you believe this is an error, please contact your manager or HR.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { employee, schedules, completedTrainings, requiredTrainings, documents } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Employee Portal</h1>
        <p className="text-muted-foreground">
          {employee.position ? `${employee.position} - ${employee.department || 'General'}` : 'Welcome to your employee portal'}
        </p>
      </div>

      {/* Employee Info Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">My Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Employee #</p>
              <p className="font-medium">{employee.employee_number || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Department</p>
              <p className="font-medium">{employee.department || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Type</p>
              <Badge variant="outline">{employee.employment_type}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Hire Date</p>
              <p className="font-medium">{new Date(employee.hire_date).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="trainings">Trainings</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>My Schedule</CardTitle>
              <CardDescription>
                {schedules && schedules.length > 0
                  ? "Your current work schedule"
                  : "Your schedule hasn't been set up yet. Check with your manager for your assigned hours."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schedules && schedules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((sched: any) => (
                      <TableRow key={sched.id}>
                        <TableCell className="font-medium">{DAYS[sched.day_of_week]}</TableCell>
                        <TableCell>{sched.start_time}</TableCell>
                        <TableCell>{sched.end_time}</TableCell>
                        <TableCell>{sched.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No schedule assigned yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trainings">
          <Card>
            <CardHeader>
              <CardTitle>Trainings</CardTitle>
              <CardDescription>
                Required and completed training courses. Some trainings include private video content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {requiredTrainings && requiredTrainings.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Required Trainings</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Training</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requiredTrainings.map((training: any) => {
                        const completed = completedTrainings?.find((c: any) => c.training_id === training.id)
                        return (
                          <TableRow key={training.id}>
                            <TableCell className="font-medium">{training.title}</TableCell>
                            <TableCell>{training.training_type || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={completed ? 'default' : 'destructive'}>
                                {completed ? 'Completed' : 'Required'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {completedTrainings && completedTrainings.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Completed</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Training</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Expires</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedTrainings.map((comp: any) => (
                        <TableRow key={comp.id}>
                          <TableCell className="font-medium">{comp.trainings?.title}</TableCell>
                          <TableCell>{new Date(comp.completed_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {comp.expires_at
                              ? new Date(comp.expires_at).toLocaleDateString()
                              : 'Never'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {(!requiredTrainings || requiredTrainings.length === 0) && (!completedTrainings || completedTrainings.length === 0) && (
                <p className="text-sm text-muted-foreground">No trainings assigned yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Access the employee handbook, policies, and personal documents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents && documents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Scope</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.title}</TableCell>
                        <TableCell>{doc.document_type || '-'}</TableCell>
                        <TableCell>{doc.version || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {doc.is_org_wide ? 'Organization' : 'Personal'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No documents available. The employee handbook and policies will appear here once uploaded.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
