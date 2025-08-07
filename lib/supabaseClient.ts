//curentlty this is unused
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fduzlslvxoyokjtzwpqi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdXpsc2x2eG95b2tqdHp3cHFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTUzNTEsImV4cCI6MjA3MDEzMTM1MX0.yDjdPA3gc4Okk8AZxaJ6j6VQepoeXzn0oOx0WfSHoU8'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  }
})