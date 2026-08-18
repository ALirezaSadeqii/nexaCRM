
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const supabaseKey = (process.env.NEXT_PUBLIC_ANON_KEY || '').trim()

let client = null

if (supabaseUrl && supabaseKey) {
  try {
    client = createClient(supabaseUrl, supabaseKey)
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err)
  }
}

const dummySupabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({
      data: null,
      error: { message: 'Supabase URL or Key is missing or invalid in environment config.' }
    }),
    signOut: async () => ({ error: null }),
  }
}

const supabase = client || dummySupabase

export default supabase