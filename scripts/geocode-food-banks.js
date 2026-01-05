const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// This script geocodes food banks that don't have coordinates
// Usage: node scripts/geocode-food-banks.js

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

if (!googleMapsApiKey) {
  console.error('❌ Missing Google Maps API key')
  console.log('Make sure GOOGLE_MAPS_API_KEY is set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Geocode an address using Google Maps API
async function geocodeAddress(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location
      return {
        latitude: location.lat,
        longitude: location.lng,
        formatted_address: data.results[0].formatted_address
      }
    } else if (data.status === 'ZERO_RESULTS') {
      return null
    } else {
      throw new Error(`Geocoding failed: ${data.status} - ${data.error_message || 'Unknown error'}`)
    }
  } catch (error) {
    console.error('Geocoding error:', error.message)
    return null
  }
}

// Add delay to respect API rate limits
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function geocodeFoodBanks() {
  console.log('🗺️  Geocoding Food Banks Without Coordinates\n')
  console.log('═'.repeat(60))
  console.log('\n')

  try {
    // Fetch food banks without coordinates
    const { data: foodBanks, error } = await supabase
      .from('food_banks')
      .select('*')
      .or('latitude.is.null,longitude.is.null')

    if (error) {
      console.error('❌ Error fetching food banks:', error.message)
      process.exit(1)
    }

    if (!foodBanks || foodBanks.length === 0) {
      console.log('✅ All food banks already have coordinates!')
      return
    }

    console.log(`Found ${foodBanks.length} food banks without coordinates\n`)

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < foodBanks.length; i++) {
      const foodBank = foodBanks[i]
      console.log(`[${i + 1}/${foodBanks.length}] Geocoding: ${foodBank.name}`)
      console.log(`   Address: ${foodBank.address}`)

      // Geocode the address
      const result = await geocodeAddress(foodBank.address)

      if (result) {
        // Update the food bank with coordinates
        const { error: updateError } = await supabase
          .from('food_banks')
          .update({
            latitude: result.latitude,
            longitude: result.longitude
          })
          .eq('id', foodBank.id)

        if (updateError) {
          console.log(`   ❌ Failed to update: ${updateError.message}`)
          failCount++
        } else {
          console.log(`   ✅ Updated: ${result.latitude}, ${result.longitude}`)
          successCount++
        }
      } else {
        console.log(`   ⚠️  Could not geocode this address`)
        failCount++
      }

      // Add delay to respect rate limits (50 requests per second for Google Maps)
      if (i < foodBanks.length - 1) {
        await delay(100) // 100ms delay = max 10 requests/second
      }

      console.log('')
    }

    console.log('═'.repeat(60))
    console.log('\n📊 Geocoding Complete!\n')
    console.log(`✅ Successfully geocoded: ${successCount}`)
    console.log(`❌ Failed to geocode: ${failCount}`)
    console.log(`📍 Total processed: ${foodBanks.length}\n`)

    if (failCount > 0) {
      console.log('💡 Tip: Failed addresses may need manual correction in the database')
      console.log('   Check for incomplete or invalid addresses\n')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Run the script
geocodeFoodBanks()
  .then(() => {
    console.log('🎉 Done!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
