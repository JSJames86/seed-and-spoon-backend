const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// This script seeds the database with food bank data
// Usage: node scripts/seed-database.js

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Sample data structure - replace with your actual data
const foodBanksData = [
  {
    name: 'Example Community Food Bank',
    address: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zip_code: '62701',
    latitude: 39.7817,
    longitude: -89.6501,
    phone: '555-0100',
    email: 'info@example.org',
    website: 'https://example.org',
    active: true,
    notes: 'Example food bank - replace with real data'
  }
]

async function seedFoodBanks() {
  console.log('Seeding food banks...')

  const { data, error } = await supabase
    .from('food_banks')
    .insert(foodBanksData)
    .select()

  if (error) {
    console.error('Error seeding food banks:', error)
    process.exit(1)
  }

  console.log(`Successfully seeded ${data.length} food banks`)
  return data
}

async function seedServices(foodBankId) {
  console.log('Seeding services...')

  const servicesData = [
    {
      food_bank_id: foodBankId,
      service_type: 'Food Pantry',
      description: 'Weekly food distribution',
      eligibility: 'Families in need'
    },
    {
      food_bank_id: foodBankId,
      service_type: 'Hot Meals',
      description: 'Daily hot meal service',
      eligibility: 'Open to all'
    }
  ]

  const { data, error } = await supabase
    .from('services')
    .insert(servicesData)
    .select()

  if (error) {
    console.error('Error seeding services:', error)
    return
  }

  console.log(`Successfully seeded ${data.length} services`)
}

async function seedOperatingHours(foodBankId) {
  console.log('Seeding operating hours...')

  const hoursData = [
    { food_bank_id: foodBankId, day_of_week: 1, open_time: '09:00', close_time: '17:00', is_closed: false },
    { food_bank_id: foodBankId, day_of_week: 2, open_time: '09:00', close_time: '17:00', is_closed: false },
    { food_bank_id: foodBankId, day_of_week: 3, open_time: '09:00', close_time: '17:00', is_closed: false },
    { food_bank_id: foodBankId, day_of_week: 4, open_time: '09:00', close_time: '17:00', is_closed: false },
    { food_bank_id: foodBankId, day_of_week: 5, open_time: '09:00', close_time: '17:00', is_closed: false },
    { food_bank_id: foodBankId, day_of_week: 6, is_closed: true },
    { food_bank_id: foodBankId, day_of_week: 0, is_closed: true }
  ]

  const { data, error } = await supabase
    .from('operating_hours')
    .insert(hoursData)
    .select()

  if (error) {
    console.error('Error seeding operating hours:', error)
    return
  }

  console.log(`Successfully seeded ${data.length} operating hours`)
}

async function main() {
  try {
    console.log('Starting database seeding...\n')

    // Seed food banks
    const foodBanks = await seedFoodBanks()

    // Seed related data for the first food bank (example)
    if (foodBanks && foodBanks.length > 0) {
      await seedServices(foodBanks[0].id)
      await seedOperatingHours(foodBanks[0].id)
    }

    console.log('\n✅ Database seeding completed successfully!')
  } catch (error) {
    console.error('Error during seeding:', error)
    process.exit(1)
  }
}

// Run the seeding script
main()
