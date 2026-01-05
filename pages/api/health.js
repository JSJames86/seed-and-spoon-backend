import { supabase } from '../../lib/supabaseClient'
import Stripe from 'stripe'

export default async function handler(req, res) {
  const health = {
    status: 'unknown',
    timestamp: new Date().toISOString(),
    checks: {}
  }

  // Check Supabase connection
  try {
    const { data, error } = await supabase
      .from('food_banks')
      .select('id', { count: 'exact', head: true })

    if (error) {
      health.checks.supabase = {
        status: 'error',
        message: error.message
      }
    } else {
      // Get count of food banks
      const { count } = await supabase
        .from('food_banks')
        .select('*', { count: 'exact', head: true })

      // Get count of food banks with coordinates
      const { count: coordCount } = await supabase
        .from('food_banks')
        .select('*', { count: 'exact', head: true })
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      health.checks.supabase = {
        status: 'ok',
        connected: true,
        food_banks_total: count || 0,
        food_banks_with_coordinates: coordCount || 0
      }
    }
  } catch (error) {
    health.checks.supabase = {
      status: 'error',
      message: error.message,
      hint: 'Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    }
  }

  // Check Stripe configuration
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
      // Test the key by retrieving account info
      await stripe.balance.retrieve()

      health.checks.stripe = {
        status: 'ok',
        configured: true,
        webhook_secret_set: !!process.env.STRIPE_WEBHOOK_SECRET
      }
    } else {
      health.checks.stripe = {
        status: 'error',
        configured: false,
        message: 'STRIPE_SECRET_KEY not set'
      }
    }
  } catch (error) {
    health.checks.stripe = {
      status: 'error',
      configured: true,
      message: error.message,
      hint: 'Check STRIPE_SECRET_KEY is valid'
    }
  }

  // Check Google Maps API
  try {
    if (process.env.GOOGLE_MAPS_API_KEY) {
      // Test geocoding with a simple address
      const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Newark,NJ&key=${process.env.GOOGLE_MAPS_API_KEY}`
      const response = await fetch(testUrl)
      const data = await response.json()

      if (data.status === 'OK') {
        health.checks.google_maps = {
          status: 'ok',
          configured: true,
          api_responding: true
        }
      } else {
        health.checks.google_maps = {
          status: 'warning',
          configured: true,
          api_responding: false,
          message: `Google Maps API returned: ${data.status}`,
          hint: 'Check API key permissions and billing'
        }
      }
    } else {
      health.checks.google_maps = {
        status: 'error',
        configured: false,
        message: 'GOOGLE_MAPS_API_KEY not set'
      }
    }
  } catch (error) {
    health.checks.google_maps = {
      status: 'error',
      message: error.message,
      hint: 'Check GOOGLE_MAPS_API_KEY'
    }
  }

  // Check CORS configuration
  health.checks.cors = {
    status: 'info',
    allowed_origin: process.env.ALLOWED_ORIGIN || '*',
    message: process.env.ALLOWED_ORIGIN
      ? `CORS restricted to: ${process.env.ALLOWED_ORIGIN}`
      : 'CORS allows all origins (development mode)'
  }

  // Check environment
  health.checks.environment = {
    node_version: process.version,
    platform: process.platform,
    env: process.env.NODE_ENV || 'development'
  }

  // Determine overall status
  const hasErrors = Object.values(health.checks).some(
    check => check.status === 'error'
  )
  const hasWarnings = Object.values(health.checks).some(
    check => check.status === 'warning'
  )

  health.status = hasErrors ? 'degraded' : hasWarnings ? 'warning' : 'healthy'

  // Add recommendations if there are issues
  if (hasErrors || hasWarnings) {
    health.recommendations = []

    if (health.checks.supabase?.status === 'error') {
      health.recommendations.push('Set up Supabase environment variables in Vercel or .env.local')
    }

    if (health.checks.supabase?.food_banks_total === 0) {
      health.recommendations.push('Import food bank data: npm run seed:all')
    }

    if (health.checks.supabase?.food_banks_with_coordinates === 0) {
      health.recommendations.push('Geocode food banks: node scripts/geocode-food-banks.js')
    }

    if (health.checks.stripe?.status === 'error') {
      health.recommendations.push('Configure Stripe API keys in environment variables')
    }

    if (health.checks.google_maps?.status === 'error') {
      health.recommendations.push('Configure Google Maps API key in environment variables')
    }

    if (health.checks.google_maps?.api_responding === false) {
      health.recommendations.push('Enable required Google Maps APIs: Geocoding, Maps JavaScript, Distance Matrix')
    }
  }

  const statusCode = health.status === 'healthy' ? 200 : 500

  return res.status(statusCode).json(health)
}
