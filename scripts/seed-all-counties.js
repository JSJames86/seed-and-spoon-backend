const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// This script seeds the database with ALL county food bank data
// Usage: node scripts/seed-all-counties.js

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const counties = [
  { name: 'Newark/Essex', file: './data/newark-essex-food-banks.csv' },
  { name: 'Hudson', file: './data/hudson-county-food-banks.csv' },
  { name: 'Union', file: './data/union-county-food-banks.csv' },
  { name: 'Bergen', file: './data/bergen-county-food-banks.csv' }
]

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

async function seedCounty(county) {
  try {
    if (!fs.existsSync(county.file)) {
      console.error(`❌ File not found: ${county.file}`)
      return { success: false, count: 0 }
    }

    console.log(`📖 Reading ${county.name} County data...`)
    const csvText = fs.readFileSync(county.file, 'utf-8')
    const foodBanks = parseCSV(csvText)

    const { data, error } = await supabase
      .from('food_banks')
      .insert(foodBanks)
      .select()

    if (error) {
      console.error(`❌ Error importing ${county.name} County:`, error.message)
      return { success: false, count: 0 }
    }

    console.log(`✅ ${county.name} County: ${data.length} food banks imported\n`)
    return { success: true, count: data.length }

  } catch (error) {
    console.error(`❌ Error processing ${county.name} County:`, error.message)
    return { success: false, count: 0 }
  }
}

async function seedAllCounties() {
  console.log('🌱 Seeding ALL New Jersey Food Bank Data\n')
  console.log('═'.repeat(50))
  console.log('\n')

  let totalImported = 0
  let successCount = 0

  for (const county of counties) {
    const result = await seedCounty(county)
    if (result.success) {
      successCount++
      totalImported += result.count
    }
  }

  console.log('═'.repeat(50))
  console.log('\n📊 Final Summary:\n')
  console.log(`   Counties Processed: ${successCount}/${counties.length}`)
  console.log(`   Total Food Banks: ${totalImported}`)

  if (successCount === counties.length) {
    console.log('\n🎉 All counties imported successfully!')
  } else {
    console.log('\n⚠️  Some counties had errors. Check logs above.')
  }
}

// Run the seeding script
seedAllCounties()
