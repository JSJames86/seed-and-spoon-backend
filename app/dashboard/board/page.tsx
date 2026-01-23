"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSupabaseClient } from "@/lib/supabaseClientFrontend"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DashboardLoading } from "@/components/dashboard/loading-skeleton"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Gavel, CalendarDays, FileText } from "lucide-react"

export default function BoardDashboard() {
  const [meetings, setMeetings] = useState<any[]>([])
  const [policies, setPolicies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const headers = { Authorization: `Bearer ${session.access_token}` }

    const [meetingsRes, policiesRes] = await Promise.all([
      fetch('/api/board/meetings', { headers }).then(r => r.json()),
      fetch('/api/board/policies', { headers }).then(r => r.json()),
    ])

    if (meetingsRes.success) setMeetings(meetingsRes.data || [])
    if (policiesRes.success) setPolicies(policiesRes.data || [])
    setLoading(false)
  }

  if (loading) {
    return <DashboardLoading />
  }

  const upcomingMeetings = meetings.filter(m => new Date(m.scheduled_at) > new Date())
  const pastMeetings = meetings.filter(m => new Date(m.scheduled_at) <= new Date())

  return (
    <DashboardShell
      title="Board Portal"
      description="View meetings, agendas, vote on motions, and access governance documents"
      icon={Gavel}
    >

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upcoming Meetings</CardDescription>
            <CardTitle className="text-2xl">{upcomingMeetings.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Policies</CardDescription>
            <CardTitle className="text-2xl">{policies.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Past Meetings</CardDescription>
            <CardTitle className="text-2xl">{pastMeetings.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="meetings">
        <TabsList>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="policies">Policies & Bylaws</TabsTrigger>
        </TabsList>

        <TabsContent value="meetings">
          {meetings.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Board Meetings</CardTitle>
                <CardDescription>Upcoming and past board meetings with agendas</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meetings.map((meeting: any) => (
                      <TableRow key={meeting.id}>
                        <TableCell className="font-medium">{meeting.title}</TableCell>
                        <TableCell>{meeting.meeting_type}</TableCell>
                        <TableCell>{new Date(meeting.scheduled_at).toLocaleDateString()}</TableCell>
                        <TableCell>{meeting.location || (meeting.virtual_link ? 'Virtual' : '-')}</TableCell>
                        <TableCell>
                          <Badge variant={meeting.status === 'scheduled' ? 'default' : 'secondary'}>
                            {meeting.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No meetings scheduled"
              description="Board meetings, agendas, and voting will be managed here. You will receive notifications when new meetings are scheduled."
            />
          )}
        </TabsContent>

        <TabsContent value="policies">
          {policies.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Policies & Bylaws</CardTitle>
                <CardDescription>Active organizational policies and bylaws</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Effective</TableHead>
                      <TableHead>Version</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policies.map((policy: any) => (
                      <TableRow key={policy.id}>
                        <TableCell className="font-medium">{policy.title}</TableCell>
                        <TableCell><Badge variant="outline">{policy.policy_type}</Badge></TableCell>
                        <TableCell>{policy.category || '-'}</TableCell>
                        <TableCell>
                          {policy.effective_date
                            ? new Date(policy.effective_date).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell>{policy.version || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={FileText}
              title="No policies published yet"
              description="Organizational policies, bylaws, and procedures will be accessible here once published by the Executive Director."
            />
          )}
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
