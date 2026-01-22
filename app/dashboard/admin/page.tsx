"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { getSupabaseClient } from "@/lib/supabaseClientFrontend"

export default function AdminCRMDashboard() {
  const [roles, setRoles] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [households, setHouseholds] = useState<any>(null)
  const [volunteers, setVolunteers] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [backgroundChecks, setBackgroundChecks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const headers = { Authorization: `Bearer ${session.access_token}` }

    const [rolesRes, programsRes, householdsRes, volunteersRes, employeesRes, bgChecksRes] = await Promise.all([
      fetch('/api/admin/roles', { headers }).then(r => r.json()),
      fetch('/api/admin/programs', { headers }).then(r => r.json()),
      fetch('/api/admin/households', { headers }).then(r => r.json()),
      fetch('/api/admin/volunteers', { headers }).then(r => r.json()),
      fetch('/api/admin/employees', { headers }).then(r => r.json()),
      fetch('/api/admin/background-checks', { headers }).then(r => r.json()),
    ])

    if (rolesRes.success) setRoles(rolesRes.data || [])
    if (programsRes.success) setPrograms(programsRes.data || [])
    if (householdsRes.success) setHouseholds(householdsRes.data)
    if (volunteersRes.success) setVolunteers(volunteersRes.data || [])
    if (employeesRes.success) setEmployees(employeesRes.data || [])
    if (bgChecksRes.success) setBackgroundChecks(bgChecksRes.data || [])
    setLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CRM Administration</h1>
        <p className="text-muted-foreground">Manage roles, programs, households, volunteers, employees, and compliance</p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Roles Defined</CardDescription>
            <CardTitle className="text-2xl">{roles.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Programs</CardDescription>
            <CardTitle className="text-2xl">{programs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Households</CardDescription>
            <CardTitle className="text-2xl">{households?.pagination?.total || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Volunteers</CardDescription>
            <CardTitle className="text-2xl">{volunteers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Employees</CardDescription>
            <CardTitle className="text-2xl">{employees.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="households">Households</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>System Roles</CardTitle>
              <CardDescription>
                Roles define access levels across the platform. Users can have multiple roles simultaneously.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role: any) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>{role.description}</TableCell>
                      <TableCell>
                        <Badge variant={role.is_active ? 'default' : 'secondary'}>
                          {role.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs">
          <Card>
            <CardHeader>
              <CardTitle>Programs</CardTitle>
              <CardDescription>
                {programs.length > 0
                  ? "Active and archived programs with enrollment counts"
                  : "Create programs to organize food assistance, education, and community services for clients."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {programs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Capacity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs.map((prog: any) => (
                      <TableRow key={prog.id}>
                        <TableCell className="font-medium">{prog.name}</TableCell>
                        <TableCell>{prog.program_type || '-'}</TableCell>
                        <TableCell><Badge variant="outline">{prog.status}</Badge></TableCell>
                        <TableCell>{prog.capacity || 'Unlimited'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No programs created. Use the API to create programs.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="households">
          <Card>
            <CardHeader>
              <CardTitle>Households</CardTitle>
              <CardDescription>
                {(households?.pagination?.total || 0) > 0
                  ? "Client households and family units"
                  : "Households represent family units receiving services. Clients create these when they set up their profiles."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {households?.data && households.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Members</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {households.data.map((h: any) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">{h.name || 'Unnamed'}</TableCell>
                        <TableCell>{h.profiles?.email || h.phone || '-'}</TableCell>
                        <TableCell><Badge variant="outline">{h.status}</Badge></TableCell>
                        <TableCell>{h.household_members?.[0]?.count || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No households registered yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Employees</CardTitle>
              <CardDescription>
                {employees.length > 0
                  ? "All employee records"
                  : "Employee records will appear here once staff are onboarded. Employees 16-17 are flagged as minors with work restrictions."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employees.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Minor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp: any) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.profiles?.email || '-'}</TableCell>
                        <TableCell>{emp.department || '-'}</TableCell>
                        <TableCell>{emp.position || '-'}</TableCell>
                        <TableCell><Badge variant="outline">{emp.status}</Badge></TableCell>
                        <TableCell>{emp.is_minor ? <Badge variant="destructive">Yes</Badge> : 'No'}</TableCell>
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

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Background Checks</CardTitle>
              <CardDescription>
                All adults (18+) volunteering or employed require background checks. Track status and expiration here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {backgroundChecks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backgroundChecks.map((check: any) => (
                      <TableRow key={check.id}>
                        <TableCell className="font-medium">{check.profiles?.email || '-'}</TableCell>
                        <TableCell>{check.check_type}</TableCell>
                        <TableCell>
                          <Badge variant={
                            check.status === 'passed' ? 'default' :
                            check.status === 'failed' ? 'destructive' : 'secondary'
                          }>
                            {check.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{check.provider || '-'}</TableCell>
                        <TableCell>
                          {check.expires_at
                            ? new Date(check.expires_at).toLocaleDateString()
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No background checks initiated. Background checks are required for all adult (18+) volunteers and employees.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
