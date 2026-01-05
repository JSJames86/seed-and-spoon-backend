// Google Maps API utilities for geocoding, distance calculation, and mapping
// Requires: GOOGLE_MAPS_API_KEY environment variable

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

/**
 * Geocode an address to get latitude/longitude coordinates
 * @param {string} address - Full address to geocode
 * @returns {Promise<{lat: number, lng: number, formatted_address: string}>}
 */
export async function geocodeAddress(address) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured')
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location
      return {
        lat: location.lat,
        lng: location.lng,
        formatted_address: data.results[0].formatted_address
      }
    } else {
      throw new Error(`Geocoding failed: ${data.status}`)
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    throw error
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in miles
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959 // Earth's radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return distance
}

function toRad(degrees) {
  return degrees * (Math.PI / 180)
}

/**
 * Get directions URL for Google Maps
 * @param {string} origin - Starting address or coordinates
 * @param {string} destination - Destination address or coordinates
 * @returns {string} Google Maps directions URL
 */
export function getDirectionsUrl(origin, destination) {
  const baseUrl = 'https://www.google.com/maps/dir/'
  return `${baseUrl}${encodeURIComponent(origin)}/${encodeURIComponent(destination)}`
}

/**
 * Get static map image URL
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {object} options - Map options (zoom, size, markers)
 * @returns {string} Static map image URL
 */
export function getStaticMapUrl(lat, lng, options = {}) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured')
  }

  const {
    zoom = 15,
    width = 600,
    height = 400,
    markers = []
  } = options

  let url = `https://maps.googleapis.com/maps/api/staticmap?`
  url += `center=${lat},${lng}`
  url += `&zoom=${zoom}`
  url += `&size=${width}x${height}`

  // Add main marker
  url += `&markers=color:red%7C${lat},${lng}`

  // Add additional markers if provided
  markers.forEach(marker => {
    url += `&markers=color:${marker.color || 'blue'}%7C${marker.lat},${marker.lng}`
  })

  url += `&key=${GOOGLE_MAPS_API_KEY}`

  return url
}

/**
 * Get place details from Google Places API
 * @param {string} placeId - Google Place ID
 * @returns {Promise<object>} Place details
 */
export async function getPlaceDetails(placeId) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured')
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK') {
      return data.result
    } else {
      throw new Error(`Place details failed: ${data.status}`)
    }
  } catch (error) {
    console.error('Place details error:', error)
    throw error
  }
}

/**
 * Filter and sort food banks by proximity to user location
 * @param {Array} foodBanks - Array of food bank objects with lat/lng
 * @param {number} userLat - User's latitude
 * @param {number} userLng - User's longitude
 * @param {number} radiusMiles - Maximum radius in miles
 * @returns {Array} Sorted array of food banks with distance property
 */
export function filterByProximity(foodBanks, userLat, userLng, radiusMiles = 10) {
  return foodBanks
    .map(foodBank => {
      if (!foodBank.latitude || !foodBank.longitude) {
        return null
      }

      const distance = calculateDistance(
        userLat,
        userLng,
        foodBank.latitude,
        foodBank.longitude
      )

      return {
        ...foodBank,
        distance: Math.round(distance * 10) / 10 // Round to 1 decimal
      }
    })
    .filter(foodBank => foodBank && foodBank.distance <= radiusMiles)
    .sort((a, b) => a.distance - b.distance)
}
