import { supabase } from '../../../lib/supabaseClient'
import { filterByProximity, getDirectionsUrl } from '../../../lib/googleMapsClient'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const {
        latitude,
        longitude,
        radius = 10,
        county,
        city,
        include_directions = false
      } = req.query

      let query = supabase
        .from('food_banks')
        .select('*')
        .eq('active', true)

      // Filter by county if provided
      if (county) {
        query = query.eq('county', county)
      }

      // Filter by city if provided
      if (city) {
        query = query.ilike('city', city)
      }

      const { data, error } = await query

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      let foodBanks = data

      // If coordinates provided, filter by proximity and add distance
      if (latitude && longitude) {
        const userLat = parseFloat(latitude)
        const userLng = parseFloat(longitude)
        const radiusMiles = parseFloat(radius)

        foodBanks = filterByProximity(foodBanks, userLat, userLng, radiusMiles)

        // Optionally add directions URL
        if (include_directions === 'true') {
          foodBanks = foodBanks.map(fb => ({
            ...fb,
            directions_url: getDirectionsUrl(`${userLat},${userLng}`, fb.address)
          }))
        }
      } else {
        // No proximity filtering, just sort by name
        foodBanks = foodBanks.sort((a, b) => a.name.localeCompare(b.name))
      }

      return res.status(200).json({
        foodBanks,
        count: foodBanks.length,
        filters: {
          latitude: latitude || null,
          longitude: longitude || null,
          radius: latitude && longitude ? parseFloat(radius) : null,
          county: county || null,
          city: city || null
        }
      })
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
