import { createClient } from '@supabase/supabase-js'

let supabaseInstance = null

function getSupabase() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  supabaseInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  return supabaseInstance
}

// Export getter that creates client on first use (lazy initialization)
export const supabase = new Proxy({}, {
  get(_, prop) {
    return getSupabase()[prop]
  }
})
