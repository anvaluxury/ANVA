import { useEffect, useState } from 'react'
import { supabase } from './supabase'
let cache: Promise<any[]> | null = null
export const usePromos = () => { const [p, setP] = useState<any[]>([]); useEffect(() => { cache ??= Promise.resolve(supabase.from('promotions').select('*').eq('is_active', true)).then((r: any) => r.data ?? []); void cache.then(setP) }, []); return p }
// One best price: the biggest single discount wins (product discount and promotions never stack). Base AMD price is never modified.
export function effective(p: any, promos: any[]) {
  const base = Number(p.price_amd); const now = Date.now(); let best = base * (1 - (Number(p.discount_percent) || 0) / 100)
  for (const x of promos) {
    if (now < Date.parse(x.starts_at) || now > Date.parse(x.ends_at)) continue
    if (!((x.product_id && x.product_id === p.id) || (x.category_id && x.category_id === p.category_id))) continue
    const c = x.promo_price_amd != null ? Number(x.promo_price_amd) : base * (1 - Number(x.percent || 0) / 100); if (c < best) best = c
  }
  best = Math.max(0, best); return { price: best, base, pct: base > 0 ? Math.round((1 - best / base) * 100) : 0 }
}
