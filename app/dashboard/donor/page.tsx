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
import { Heart, RefreshCw, FileText } from "lucide-react"

export default function DonorDashboard() {
  const [donations, setDonations] = useState<any[]>([])
  const [recurring, setRecurring] = useState<any[]>([])
  const [taxDocs, setTaxDocs] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const headers = { Authorization: `Bearer ${session.access_token}` }

    const [donationsRes, recurringRes, taxDocsRes, statsRes] = await Promise.all([
      fetch('/api/donations/history', { headers }).then(r => r.json()),
      fetch('/api/donations/recurring', { headers }).then(r => r.json()),
      fetch('/api/donations/tax-documents', { headers }).then(r => r.json()),
      fetch('/api/donations/stats', { headers }).then(r => r.json()),
    ])

    if (donationsRes.success) setDonations(donationsRes.data || [])
    if (recurringRes.success) setRecurring(recurringRes.data || [])
    if (taxDocsRes.success) setTaxDocs(taxDocsRes.data || [])
    if (statsRes.success) setStats(statsRes.data)
    setLoading(false)
  }

  if (loading) {
    return <DashboardLoading />
  }

  const isNewDonor = donations.length === 0 && recurring.length === 0

  return (
    <DashboardShell
      title="Donor Dashboard"
      description="Track your contributions, manage recurring donations, and access tax documents"
      icon={Heart}
    >
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Donated</CardDescription>
            <CardTitle className="text-2xl">
              ${stats?.total_amount ? Number(stats.total_amount).toLocaleString() : '0'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Donations Made</CardDescription>
            <CardTitle className="text-2xl">{stats?.total_donations || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Recurring</CardDescription>
            <CardTitle className="text-2xl">
              {recurring.filter(r => r.status === 'active').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Donation History</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
          <TabsTrigger value="tax">Tax Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          {donations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Donation History</CardTitle>
                <CardDescription>All your one-time and recurring donations</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {donations.map((donation: any) => (
                      <TableRow key={donation.id}>
                        <TableCell>{new Date(donation.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">${Number(donation.amount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={donation.status === 'succeeded' ? 'default' : 'secondary'}>
                            {donation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{donation.donation_type || 'one-time'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={Heart}
              title="No donations yet"
              description="Your donation history will appear here once you make your first contribution. Every dollar helps families access nutritious food."
              action={{ label: "Make a donation" }}
            />
          )}
        </TabsContent>

        <TabsContent value="recurring">
          {recurring.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Recurring Donations</CardTitle>
                <CardDescription>Manage your recurring contributions. You can pause, resume, or cancel at any time.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Next Charge</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recurring.map((rec: any) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-medium">${Number(rec.amount).toLocaleString()}</TableCell>
                        <TableCell>{rec.frequency}</TableCell>
                        <TableCell>
                          <Badge variant={rec.status === 'active' ? 'default' : 'secondary'}>
                            {rec.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{rec.next_charge_date ? new Date(rec.next_charge_date).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={RefreshCw}
              title="No recurring donations"
              description="Set up a recurring donation to provide consistent, reliable support. Monthly giving helps us plan ahead and serve more families."
              action={{ label: "Set up recurring donation" }}
            />
          )}
        </TabsContent>

        <TabsContent value="tax">
          {taxDocs.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Tax Documents</CardTitle>
                <CardDescription>Download receipts and year-end summaries for tax purposes.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Year</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Generated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxDocs.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.tax_year}</TableCell>
                        <TableCell>{doc.document_type}</TableCell>
                        <TableCell>${doc.total_amount ? Number(doc.total_amount).toLocaleString() : '-'}</TableCell>
                        <TableCell>{new Date(doc.generated_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={FileText}
              title="No tax documents yet"
              description="Tax receipts and year-end donation summaries will be generated automatically and available here for download."
            />
          )}
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
