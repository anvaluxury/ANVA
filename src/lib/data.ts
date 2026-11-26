import { useEffect, useState } from 'react'
import type { Lang } from '../i18n'
import { supabase, supabaseConfigured } from './supabase'

export type Contact = Record<string, string>
export const tel = (v: string) => v.replace(/[^\d+]/g, '')
export const pick = <T extends { lang: string }>(a: T[] | null | undefined, l: Lang): T | undefined => a?.find(x => x.lang === l) ?? a?.find(x => x.lang === 'en') ?? a?.[0]
export const storageUrl = (bucket: string, path?: string | null) => (path ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : undefined)
export const t3 = (l: Lang, hy: string, ru: string, en: string) => (l === 'hy' ? hy : l === 'ru' ? ru : en)

let contactCache: Promise<Contact> | null = null
/** Public contact + social links (site_settings.contact), fetched once per page load. */
export function useContact(): Contact {
  const [c, setC] = useState<Contact>({})
  useEffect(() => {
    if (!supabaseConfigured) return
    contactCache ??= Promise.resolve(supabase.from('site_settings').select('value').eq('key', 'contact').maybeSingle()).then(r => (r.data?.value ?? {}) as Contact)
    let alive = true; void contactCache.then(v => alive && setC(v)); return () => { alive = false }
  }, [])
  return c
}
export const invalidateContact = () => { contactCache = null }
