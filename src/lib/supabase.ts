import { createBrowserClient } from '@supabase/ssr'

// Strip /rest/v1/ suffix that Supabase adds to REST URLs but which
// the JS SDK must NOT receive — it builds its own path internally.
function cleanUrl(raw: string): string {
  return raw.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

const url = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (typeof window !== 'undefined' && key.startsWith('sb_secret_')) {
  console.error(
    '[Supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY contains a SECRET key.\n' +
    'Go to your Supabase Dashboard → Project Settings → API and copy\n' +
    'the "anon / public" key (starts with sb_publishable_ or eyJ...).\n' +
    'Secret keys must NEVER be exposed to the browser.',
  )
}

const validUrl = /^https?:\/\/.+/.test(url) ? url : 'https://placeholder.supabase.co'
const validKey = key || 'placeholder-key'

// createBrowserClient automatically syncs the auth session into cookies!
export const supabase = createBrowserClient(validUrl, validKey)
