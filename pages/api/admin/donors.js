import { supabase } from '../../../lib/supabaseClient'
import { requireStaff } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const {
    limit = 200,
    offset = 0,
    sort = 'total_donated',
    order = 'desc',
    status,
    search
  } = req.query

  try {
    let query = supabase
      .from('donors')
      .select(`
        id,
        name,
        email,
        phone,
        donor_type,
        status,
        created_at,
        donations (
          amount,
          status,
          created_at
        )
      `)
      .order(sort, { ascending: order === 'asc' })
      .range(Number(offset), Number(offset) + Number(limit) - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: donors, error } = await query

    if (error) throw error

    const shaped = donors.map((d) => {
      const succeeded = (d.donations || []).filter(x => x.status === 'succeeded')
      const total_donated = succeeded.reduce((sum, x) => sum + parseFloat(x.amount || 0), 0)
      const recent_donations = succeeded
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3)
        .map(x => ({ amount: x.amount, created_at: x.created_at }))

      return {
        id: d.id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        donor_type: d.donor_type,
        status: d.status,
        created_at: d.created_at,
        total_donated,
        recent_donations
      }
    })

    return res.status(200).json({ success: true, data: shaped })
  } catch (error) {
    console.error('List donors error:', error)
    return res.status(500).json({ success: false, error: 'Failed to fetch donors', details: error.message })
  }
}

export default requireStaff(handler)
