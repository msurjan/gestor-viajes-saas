// Server-only Supabase client — import ONLY from Server Actions and API Routes.
// Uses SUPABASE_SERVICE_ROLE_KEY if available (bypasses RLS),
// otherwise falls back to the anon key.
import { createClient } from '@supabase/supabase-js'

function cleanUrl(raw: string): string {
  return raw.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

const url    = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
            ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            ?? ''

const validUrl = /^https?:\/\/.+/.test(url) ? url : 'https://placeholder.supabase.co'

export const supabaseServer = createClient(validUrl, secret, {
  auth: { persistSession: false },
})
