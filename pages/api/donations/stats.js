import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { period = 'all' } = req.query

      // Calculate date range based on period
      let startDate = null
      const now = new Date()

      switch (period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString()
          break
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7)).toISOString()
          break
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString()
          break
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString()
          break
        case 'all':
        default:
          startDate = null
      }

      let query = supabase.from('donations').select('*')

      if (startDate) {
        query = query.gte('created_at', startDate)
      }

      const { data, error } = await query

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      // Calculate statistics
      const succeededDonations = data.filter(d => d.status === 'succeeded')
      const failedDonations = data.filter(d => d.status === 'failed')
      const pendingDonations = data.filter(d => d.status === 'pending')

      const totalAmount = succeededDonations.reduce((sum, d) => sum + parseFloat(d.amount), 0)
      const averageDonation = succeededDonations.length > 0
        ? totalAmount / succeededDonations.length
        : 0

      // Group by currency
      const byCurrency = succeededDonations.reduce((acc, d) => {
        const currency = d.currency.toUpperCase()
        if (!acc[currency]) {
          acc[currency] = { count: 0, total: 0 }
        }
        acc[currency].count++
        acc[currency].total += parseFloat(d.amount)
        return acc
      }, {})

      // Get unique donors
      const uniqueDonors = new Set(succeededDonations.map(d => d.donor_email)).size

      // Find largest donation
      const largestDonation = succeededDonations.length > 0
        ? Math.max(...succeededDonations.map(d => parseFloat(d.amount)))
        : 0

      return res.status(200).json({
        period: period,
        total_donations: data.length,
        successful: {
          count: succeededDonations.length,
          total_amount: Math.round(totalAmount * 100) / 100,
          average_donation: Math.round(averageDonation * 100) / 100,
          largest_donation: Math.round(largestDonation * 100) / 100
        },
        failed: {
          count: failedDonations.length
        },
        pending: {
          count: pendingDonations.length
        },
        unique_donors: uniqueDonors,
        by_currency: byCurrency,
        success_rate: data.length > 0
          ? Math.round((succeededDonations.length / data.length) * 100)
          : 0
      })

    } catch (error) {
      console.error('Error fetching donation stats:', error)
      return res.status(500).json({
        error: 'Failed to fetch donation statistics',
        message: error.message
      })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }
}
