const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// This script imports food banks from a CSV file
// Usage: node scripts/import-csv.js <path-to-csv-file>

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
    const values = line.split(',').map(v => v.trim())
    const obj = {}

    headers.forEach((header, index) => {
      let value = values[index] || ''

      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1)
      }

      // Convert to appropriate types
      if (header === 'latitude' || header === 'longitude') {
        obj[header] = value ? parseFloat(value) : null
      } else if (header === 'active') {
        obj[header] = value.toLowerCase() === 'true' || value === '1'
      } else {
        obj[header] = value || null
      }
    })

    return obj
  })
}

async function importFoodBanks(csvPath) {
  try {
    // Read CSV file
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ File not found: ${csvPath}`)
      process.exit(1)
    }

    console.log(`📖 Reading CSV file: ${csvPath}`)
    const csvText = fs.readFileSync(csvPath, 'utf-8')

    // Parse CSV
    const foodBanks = parseCSV(csvText)
    console.log(`✅ Parsed ${foodBanks.length} food banks from CSV\n`)

    // Preview first entry
    if (foodBanks.length > 0) {
      console.log('Preview of first entry:')
      console.log(JSON.stringify(foodBanks[0], null, 2))
      console.log('\n')
    }

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

    console.log(`\n✅ Successfully imported ${data.length} food banks!`)

    // Show summary
    console.log('\nImported food banks:')
    data.forEach((fb, index) => {
      console.log(`${index + 1}. ${fb.name} - ${fb.city}, ${fb.state}`)
    })

  } catch (error) {
    console.error('❌ Error during import:', error)
    process.exit(1)
  }
}

// Main execution
const csvPath = process.argv[2]

if (!csvPath) {
  console.log('Usage: node scripts/import-csv.js <path-to-csv-file>')
  console.log('\nExample:')
  console.log('  node scripts/import-csv.js data/food_banks.csv')
  process.exit(1)
}

importFoodBanks(csvPath)
