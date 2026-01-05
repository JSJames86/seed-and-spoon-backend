import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { food_bank_id, service_type } = req.query

      let query = supabase
        .from('services')
        .select(`
          *,
          food_banks (
            id,
            name,
            address,
            phone
          )
        `)

      // Filter by food bank if provided
      if (food_bank_id) {
        query = query.eq('food_bank_id', food_bank_id)
      }

      // Filter by service type if provided
      if (service_type) {
        query = query.eq('service_type', service_type)
      }

      query = query.order('service_type')

      const { data, error } = await query

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ services: data })
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch services' })
    }
  } else if (req.method === 'POST') {
    try {
      const serviceData = req.body

      const { data, error } = await supabase
        .from('services')
        .insert([serviceData])
        .select()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(201).json({ service: data[0] })
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create service' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }
}
