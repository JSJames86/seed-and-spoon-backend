import { supabase } from '../../../lib/supabaseClient'
import { filterByProximity, getDirectionsUrl, getStaticMapUrl } from '../../../lib/googleMapsClient'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const {
        latitude,
        longitude,
        radius = 5,
        limit = 10,
        include_map = false
      } = req.query

      if (!latitude || !longitude) {
        return res.status(400).json({
          error: 'Missing required parameters',
          required: 'latitude, longitude'
        })
      }

      const userLat = parseFloat(latitude)
      const userLng = parseFloat(longitude)
      const radiusMiles = parseFloat(radius)

      // Fetch all active food banks
      const { data, error } = await supabase
        .from('food_banks')
        .select('*')
        .eq('active', true)

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      // Filter by proximity
      let nearbyFoodBanks = filterByProximity(data, userLat, userLng, radiusMiles)

      // Limit results
      nearbyFoodBanks = nearbyFoodBanks.slice(0, parseInt(limit))

      // Add directions URL and static map
      nearbyFoodBanks = nearbyFoodBanks.map(fb => ({
        ...fb,
        directions_url: getDirectionsUrl(`${userLat},${userLng}`, fb.address)
      }))

      const response = {
        location: {
          latitude: userLat,
          longitude: userLng
        },
        radius_miles: radiusMiles,
        count: nearbyFoodBanks.length,
        food_banks: nearbyFoodBanks
      }

      // Optionally include static map
      if (include_map === 'true' && nearbyFoodBanks.length > 0) {
        const markers = nearbyFoodBanks.slice(0, 5).map(fb => ({
          lat: fb.latitude,
          lng: fb.longitude,
          color: 'blue'
        }))

        response.map_url = getStaticMapUrl(userLat, userLng, {
          zoom: 12,
          width: 800,
          height: 600,
          markers
        })
      }

      return res.status(200).json(response)
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to find nearby food banks',
        message: error.message
      })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }
}
