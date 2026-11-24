import { useEffect, useMemo, useState } from 'react'
import { adminSupabase as supabase } from '../../lib/supabase'
import type { Ctx } from './Admin'
const day = (d: Date) => d.toISOString().slice(0, 10)
const Bars = ({ rows, none }: { rows: [string, number][]; none: string }) => { const m = Math.max(1, ...rows.map(r => r[1]))
  return rows.length ? <div className="bars">{rows.map(([k, v]) => <div key={k}><span>{k}</span><i style={{ width: `${(v / m) * 100}%` }} /><b>{v}</b></div>)}</div> : <p>{none}</p> }
const top = (m: Map<string, number>, n = 8, asc = false): [string, number][] => [...m.entries()].sort((a, b) => (asc ? a[1] - b[1] : b[1] - a[1])).slice(0, n)
const bump = (m: Map<string, number>, k?: string | null) => { if (k) m.set(k, (m.get(k) ?? 0) + 1) }
export default function Analytics({ T, lang }: Ctx) {
  const [range, setRange] = useState('7'); const [from, setFrom] = useState(day(new Date(Date.now() - 7 * 864e5))); const [to, setTo] = useState(day(new Date()))
  const [ev, setEv] = useState<any[]>([]); const [names, setNames] = useState<Record<string, string>>({}); const [err, setErr] = useState('')
  const bounds = useMemo(() => { const e = new Date(); if (range === 'custom') return [new Date(from), new Date(new Date(to).getTime() + 864e5)]
    const s = new Date(); s.setHours(0, 0, 0, 0); if (range !== '0') s.setDate(s.getDate() - Number(range)); return [s, e] }, [range, from, to])
  useEffect(() => { void (async () => { setErr(''); const all: any[] = []
    for (let i = 0; i < 20; i++) { const { data, error } = await supabase.from('analytics_events').select('event,session_id,lang,country,product_id,category_id,meta,created_at').gte('created_at', bounds[0].toISOString()).lt('created_at', bounds[1].toISOString()).order('created_at').range(i * 1000, i * 1000 + 999)
      if (error) { setErr(error.message); break } all.push(...(data ?? [])); if ((data?.length ?? 0) < 1000) break }
    setEv(all)
    const [p, c] = await Promise.all([supabase.from('products').select('id,product_translations(lang,name)'), supabase.from('categories').select('id,category_translations(lang,name)')])
    const n: Record<string, string> = {}; for (const x of [...(p.data ?? []), ...(c.data ?? [])] as any[]) n[x.id] = ((x.product_translations ?? x.category_translations).find((t: any) => t.lang === lang) ?? (x.product_translations ?? x.category_translations)[0])?.name; setNames(n) })() }, [bounds, lang])
  const d = useMemo(() => { const pv = ev.filter(e => e.event === 'page_view'); const sess = new Set(ev.map(e => e.session_id).filter(Boolean)); const vis = new Map<string, Set<string>>()
    for (const e of ev) { const v = e.meta?.vid; if (v) { if (!vis.has(v)) vis.set(v, new Set()); vis.get(v)!.add(e.created_at.slice(0, 10)) } }
    const pm = new Map<string, number>(), cm = new Map<string, number>(), co = new Map<string, number>(), lg = new Map<string, number>(), days = new Map<string, number>(); let orders = 0, favs = 0
    for (const e of ev) { if (e.event === 'product_view') bump(pm, names[e.product_id]); if (e.event === 'category_view') bump(cm, names[e.category_id]); if (e.event === 'page_view') { bump(co, e.country); bump(lg, e.lang?.toUpperCase()); bump(days, e.created_at.slice(0, 10)) }
      if (e.event.startsWith('order_')) orders++; if (e.event === 'favorite_add') favs++ }
    return { pv: pv.length, sess: sess.size, vis: vis.size, ret: [...vis.values()].filter(s => s.size > 1).length, pm, cm, co, lg, days, orders, favs } }, [ev, names])
  return <>
    <section className="glass box"><div className="bar"><h3>{T('analytics')}</h3><div className="acts" style={{ margin: 0 }}>
      <select value={range} onChange={e => setRange(e.target.value)}><option value="0">{T('today')}</option><option value="7">{T('d7')}</option><option value="30">{T('d30')}</option><option value="custom">{T('custom')}</option></select>
      {range === 'custom' && <><input type="date" value={from} onChange={e => setFrom(e.target.value)} /><input type="date" value={to} onChange={e => setTo(e.target.value)} /></>}</div></div>
      {err && <p role="alert">{err}</p>}
      <div className="stats" style={{ padding: 0 }}>{([['views', d.pv], ['visitors', d.vis], ['sessions', d.sess], ['returning', d.ret], ['orders', d.orders], ['favs', d.favs]] as [any, number][]).map(([k, v]) => <div key={k}><small>{T(k)}</small><strong>{v}</strong></div>)}</div></section>
    <section className="glass box"><h4>{T('views')}</h4><Bars rows={[...d.days.entries()].sort()} none={T('no_data')} /></section>
    <div className="two"><section className="glass box"><h4>{T('top_products')}</h4><Bars rows={top(d.pm)} none={T('no_data')} /></section><section className="glass box"><h4>{T('low_products')}</h4><Bars rows={top(d.pm, 8, true)} none={T('no_data')} /></section>
      <section className="glass box"><h4>{T('top_cats')}</h4><Bars rows={top(d.cm)} none={T('no_data')} /></section><section className="glass box"><h4>{T('countries')}</h4><Bars rows={top(d.co)} none={T('no_data')} /></section>
      <section className="glass box"><h4>{T('languages')}</h4><Bars rows={top(d.lg)} none={T('no_data')} /></section></div></>
}
