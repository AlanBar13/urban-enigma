import { getCookies, setCookie } from '@tanstack/react-start/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/database.types'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_KEY!

export function getSupabaseClient() {
  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({
          name,
          value,
        }))
      },
      setAll(cookies) {
        cookies.forEach((cookie) => {
          // Options carry maxAge/path/sameSite — and encode deletions as
          // maxAge: 0. Dropping them turns a delete into a permanent empty
          // cookie and orphans chunked token cookies.
          setCookie(cookie.name, cookie.value, cookie.options)
        })
      },
    },
  })
}

/**
 * Service-role client: no cookies, no session, bypasses RLS.
 *
 * Only for work that runs outside a request from a signed-in user — today that
 * is the nightly cuotas cron, which has no session to borrow and would read
 * back nothing under RLS. Never call this from a route a user can reach.
 */
export function getServiceSupabaseClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!secretKey) throw new Error('SUPABASE_SECRET_KEY is not configured')

  return createClient<Database>(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
