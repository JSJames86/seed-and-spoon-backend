import { calculateDistance } from '../../../lib/googleMapsClient'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { lat1, lng1, lat2, lng2 } = req.query

      if (!lat1 || !lng1 || !lat2 || !lng2) {
        return res.status(400).json({
          error: 'Missing required parameters',
          required: 'lat1, lng1, lat2, lng2'
        })
      }

      const distance = calculateDistance(
        parseFloat(lat1),
        parseFloat(lng1),
        parseFloat(lat2),
        parseFloat(lng2)
      )

      return res.status(200).json({
        distance_miles: Math.round(distance * 10) / 10,
        distance_km: Math.round(distance * 1.60934 * 10) / 10,
        origin: { latitude: parseFloat(lat1), longitude: parseFloat(lng1) },
        destination: { latitude: parseFloat(lat2), longitude: parseFloat(lng2) }
      })
    } catch (error) {
      return res.status(500).json({
        error: 'Distance calculation failed',
        message: error.message
      })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }
}
