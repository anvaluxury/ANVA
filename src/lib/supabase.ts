import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && key)

const supabaseUrl = url ?? 'http://localhost'
const supabaseKey = key ?? 'missing'

// Սովորական օգտատերերի առանձին session
export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      storageKey: 'anva-customer-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)

// Ադմինիստրատորների առանձին session
export const adminSupabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      storageKey: 'anva-admin-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
)

export const setRemember = (value: boolean) => {
  localStorage.setItem('anva_remember', value ? '1' : '0')
  sessionStorage.setItem('anva_alive', '1')
}

export const enforceRemember = async () => {
  if (
    localStorage.getItem('anva_remember') === '0' &&
    !sessionStorage.getItem('anva_alive')
  ) {
    await supabase.auth.signOut()
  }

  sessionStorage.setItem('anva_alive', '1')
}