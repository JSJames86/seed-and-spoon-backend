import { geocodeAddress } from '../../../lib/googleMapsClient'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { address } = req.body

      if (!address) {
        return res.status(400).json({ error: 'Address is required' })
      }

      const result = await geocodeAddress(address)

      return res.status(200).json({
        address: result.formatted_address,
        coordinates: {
          latitude: result.lat,
          longitude: result.lng
        }
      })
    } catch (error) {
      return res.status(500).json({
        error: 'Geocoding failed',
        message: error.message
      })
    }
  } else if (req.method === 'GET') {
    try {
      const { address } = req.query

      if (!address) {
        return res.status(400).json({ error: 'Address query parameter is required' })
      }

      const result = await geocodeAddress(address)

      return res.status(200).json({
        address: result.formatted_address,
        coordinates: {
          latitude: result.lat,
          longitude: result.lng
        }
      })
    } catch (error) {
      return res.status(500).json({
        error: 'Geocoding failed',
        message: error.message
      })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }
}
