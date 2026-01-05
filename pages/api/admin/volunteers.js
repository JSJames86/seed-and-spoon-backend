import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  // TODO: Add authentication/authorization middleware
  // For now, this is a manual-first approach

  if (req.method === 'GET') {
    try {
      const { status, food_bank_id, limit = 50, offset = 0 } = req.query

      let query = supabase
        .from('volunteers')
        .select(`
          *,
          food_banks (
            id,
            name
          )
        `)

      // Filter by status if provided
      if (status) {
        query = query.eq('status', status)
      }

      // Filter by food bank if provided
      if (food_bank_id) {
        query = query.eq('food_bank_id', food_bank_id)
      }

      query = query
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

      const { data, error, count } = await query

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({
        volunteers: data,
        total: count
      })
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch volunteers' })
    }
  } else if (req.method === 'POST') {
    try {
      const volunteerData = {
        ...req.body,
        status: req.body.status || 'pending',
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('volunteers')
        .insert([volunteerData])
        .select()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(201).json({ volunteer: data[0] })
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create volunteer record' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }
}
