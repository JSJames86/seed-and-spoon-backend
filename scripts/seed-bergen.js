const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// This script seeds the database with Bergen County food bank data
// Usage: node scripts/seed-bergen.js

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Simple CSV parser
function parseCSV(text) {
  const lines = text.split('\n').filter(line => line.trim())
  const headers = lines[0].split(',').map(h => h.trim())

  return lines.slice(1).map(line => {
    // Handle quoted values that may contain commas
    const regex = /(".*?"|[^,]+)(?=\s*,|\s*$)/g
    const values = []
    let match

    while ((match = regex.exec(line)) !== null) {
      let value = match[1].trim()
      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1)
      }
      values.push(value)
    }

    const obj = {}
    headers.forEach((header, index) => {
      let value = values[index] || ''

      // Convert to appropriate types
      if (header === 'active') {
        obj[header] = value.toLowerCase() === 'true' || value === '1'
      } else if (value === 'n/a' || value === '') {
        obj[header] = null
      } else {
        obj[header] = value
      }
    })

    return obj
  })
}

async function seedBergenData() {
  try {
    console.log('🌱 Seeding Bergen County Food Bank Data\n')

    // Read the CSV file
    const csvPath = './data/bergen-county-food-banks.csv'
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ File not found: ${csvPath}`)
      process.exit(1)
    }

    console.log('📖 Reading food bank data...')
    const csvText = fs.readFileSync(csvPath, 'utf-8')
    const foodBanks = parseCSV(csvText)

    console.log(`✅ Parsed ${foodBanks.length} food banks\n`)

    // Import to Supabase
    console.log('📤 Importing to Supabase...')

    const { data, error } = await supabase
      .from('food_banks')
      .insert(foodBanks)
      .select()

    if (error) {
      console.error('❌ Error importing food banks:', error)
      process.exit(1)
    }

    console.log(`\n✅ Successfully imported ${data.length} food banks!\n`)

    // Show summary by city
    const cityCounts = {}
    data.forEach(fb => {
      const city = fb.city || 'Unknown'
      cityCounts[city] = (cityCounts[city] || 0) + 1
    })

    console.log('📊 Summary by City:')
    Object.entries(cityCounts).forEach(([city, count]) => {
      console.log(`   ${city}: ${count} food banks`)
    })

    console.log('\n🎉 Database seeding completed successfully!')

  } catch (error) {
    console.error('❌ Error during seeding:', error)
    process.exit(1)
  }
}

// Run the seeding script
seedBergenData()
