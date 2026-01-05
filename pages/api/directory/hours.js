import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { food_bank_id } = req.query

      if (!food_bank_id) {
        return res.status(400).json({ error: 'food_bank_id is required' })
      }

      const { data, error } = await supabase
        .from('operating_hours')
        .select('*')
        .eq('food_bank_id', food_bank_id)
        .order('day_of_week')

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ hours: data })
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch operating hours' })
    }
  } else if (req.method === 'POST') {
    try {
      const hoursData = req.body

      const { data, error } = await supabase
        .from('operating_hours')
        .insert([hoursData])
        .select()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(201).json({ hours: data[0] })
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create operating hours' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, ...updateData } = req.body

      if (!id) {
        return res.status(400).json({ error: 'id is required' })
      }

      const { data, error } = await supabase
        .from('operating_hours')
        .update(updateData)
        .eq('id', id)
        .select()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ hours: data[0] })
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update operating hours' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }
}
