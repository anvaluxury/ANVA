import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Lang } from '../../supabase/functions/auto-translate'
export const EURO = ['AT', 'BE', 'BG', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES']
export const COUNTRIES = ['AM', 'RU', 'US', ...EURO]
const curOf = (c: string) => (c === 'AM' ? 'AMD' : c === 'RU' ? 'RUB' : c === 'US' ? 'USD' : EURO.includes(c) ? 'EUR' : 'USD')
const LANG_DEFAULT: Record<Lang, string> = { hy: 'AM', ru: 'RU', en: 'US' }
const LOCALE: Record<string, string> = { hy: 'hy-AM', ru: 'ru-RU', en: 'en-US' }
const TTL = 6 * 3600e3
type Rates = { rates: Record<string, number>; fetchedAt: number; sourceUpdated?: number }
type Ctx = { country: string; currency: string; setCountry: (c: string) => void; suggest: (l: Lang) => void; fmt: (amd: number) => string; info: { updated: number | null; stale: boolean; unavailable: boolean } }
const C = createContext<Ctx>(null as any)
export const useMoney = () => useContext(C)
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [country, setC] = useState(() => localStorage.getItem('anva_country') ?? 'AM')
  const [rates, setRates] = useState<Rates | null>(() => { try { return JSON.parse(localStorage.getItem('anva_rates') ?? 'null') } catch { return null } })
  const [stale, setStale] = useState(false)
  const manual = () => localStorage.getItem('anva_country_manual') === '1'
  const setCountry = (c: string) => { localStorage.setItem('anva_country_manual', '1'); localStorage.setItem('anva_country', c); setC(c) }
  const suggest = useCallback((l: Lang) => { if (!manual()) { const c = LANG_DEFAULT[l]; localStorage.setItem('anva_country', c); setC(c) } }, [])
  useEffect(() => {   // rates: cached 6h; on failure keep last valid rates (never invent)
    const fresh = rates && Date.now() - rates.fetchedAt < TTL
    if (fresh) return
    fetch('https://open.er-api.com/v6/latest/AMD').then(r => r.json()).then(d => {
      if (d.result !== 'success' || !d.rates?.USD) throw new Error('bad')
      const r: Rates = { rates: { AMD: 1, USD: d.rates.USD, EUR: d.rates.EUR, RUB: d.rates.RUB }, fetchedAt: Date.now(), sourceUpdated: d.time_last_update_unix * 1000 }
      localStorage.setItem('anva_rates', JSON.stringify(r)); setRates(r); setStale(false)
    }).catch(() => setStale(true))
  }, [])   // eslint-disable-line
  useEffect(() => {   // IP guess only when nothing chosen yet; manual choice always wins
    if (manual() || localStorage.getItem('anva_country_guessed')) return
    localStorage.setItem('anva_country_guessed', '1')
    fetch('https://ipapi.co/json/').then(r => r.json()).then(d => { if (COUNTRIES.includes(d.country_code)) { localStorage.setItem('anva_country', d.country_code); setC(d.country_code) } }).catch(() => {})
  }, [])
  const currency = curOf(country)
  const rate = currency === 'AMD' ? 1 : rates?.rates[currency]
  const value = useMemo<Ctx>(() => ({
    country, currency, setCountry, suggest,
    fmt: amd => { const cur = rate ? currency : 'AMD'; const v = rate ? amd * rate : amd
      return new Intl.NumberFormat(LOCALE[document.documentElement.lang] ?? 'en-US', { style: 'currency', currency: cur, maximumFractionDigits: cur === 'AMD' || cur === 'RUB' ? 0 : 2 }).format(v) },
    info: { updated: rates?.sourceUpdated ?? rates?.fetchedAt ?? null, stale, unavailable: currency !== 'AMD' && !rate },
  }), [country, currency, rate, rates, stale, suggest])
  return <C.Provider value={value}>{children}</C.Provider>
}
