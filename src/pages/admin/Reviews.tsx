import { useCallback, useEffect, useState } from 'react'
import { adminSupabase as supabase } from '../../lib/supabase'
import type { Ctx } from './Admin'
export default function Reviews({ T, lang }: Ctx) {
  const [rows, setRows] = useState<any[]>([]); const [st, setSt] = useState('pending')
  const load = useCallback(async () => { const { data } = await supabase.from('reviews').select('*,products(product_translations(lang,name))').eq('status', st).order('created_at', { ascending: false }); setRows(data ?? []) }, [st])
  useEffect(() => { void load() }, [load])
  const set = async (r: any, status: string) => { await supabase.from('reviews').update({ status }).eq('id', r.id); await load() }
  const del = async (r: any) => { if (confirm(T('confirm_del'))) { await supabase.from('reviews').delete().eq('id', r.id); await load() } }
  return <section className="glass box"><div className="bar"><h3>{T('reviews')}</h3><select value={st} onChange={e => setSt(e.target.value)}>{(['pending', 'published', 'rejected'] as const).map(s => <option key={s} value={s}>{T(`${s}_s` as any)}</option>)}</select></div>
    {rows.map(r => <div key={r.id} className="rv-row"><b>{'★'.repeat(r.rating)}</b> <small>{(r.products?.product_translations?.find((t: any) => t.lang === lang) ?? r.products?.product_translations?.[0])?.name}</small><p>{r.body}</p>
      <button onClick={() => set(r, 'published')}>✔ {T('approve')}</button><button onClick={() => set(r, 'rejected')}>✖ {T('reject')}</button><button className="red" onClick={() => del(r)}>🗑︎</button></div>)}
    {!rows.length && <p>{T('none_yet')}</p>}</section>
}
