import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { latitude, longitude, radius = 10 } = req.query

      let query = supabase
        .from('food_banks')
        .select('*')
        .eq('active', true)

      // If coordinates provided, filter by proximity
      if (latitude && longitude) {
        // This assumes you have a function in Supabase to calculate distance
        // You can also implement client-side filtering
        query = query.order('name')
      } else {
        query = query.order('name')
      }

      const { data, error } = await query

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ foodBanks: data })
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch food banks' })
    }
  } else if (req.method === 'POST') {
    try {
      const foodBankData = req.body

      const { data, error } = await supabase
        .from('food_banks')
        .insert([foodBankData])
        .select()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(201).json({ foodBank: data[0] })
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create food bank' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }
}
