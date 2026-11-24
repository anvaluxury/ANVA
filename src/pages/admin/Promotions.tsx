import { useCallback, useEffect, useState } from 'react'
import { adminSupabase as supabase } from '../../lib/supabase'
import type { Ctx } from './Admin'
const blank = { name: '', percent: '', promo_price_amd: '', target: 'product', product_id: '', category_id: '', starts_at: '', ends_at: '', is_active: true }
export default function Promotions({ T, lang }: Ctx) {
  const [rows, setRows] = useState<any[]>([]); const [prods, setProds] = useState<any[]>([]); const [cats, setCats] = useState<any[]>([]); const [f, setF] = useState<any>(blank); const [msg, setMsg] = useState('')
  const nm = (a: any[] | undefined) => (a?.find((t: any) => t.lang === lang) ?? a?.[0])?.name ?? '—'
  const load = useCallback(async () => { const [r, p, c] = await Promise.all([supabase.from('promotions').select('*').order('starts_at', { ascending: false }),
    supabase.from('products').select('id,product_translations(lang,name)'), supabase.from('categories').select('id,category_translations(lang,name)')]); setRows(r.data ?? []); setProds(p.data ?? []); setCats(c.data ?? []) }, [])
  useEffect(() => { void load() }, [load])
  const save = async () => { setMsg('')
    try { const s = new Date(f.starts_at), e = new Date(f.ends_at)
      if (!f.name.trim() || isNaN(+s) || isNaN(+e) || e <= s || (f.percent === '' && f.promo_price_amd === '') || (f.target === 'product' ? !f.product_id : !f.category_id)) throw new Error(T('err'))
      if (f.percent !== '' && (+f.percent < 0 || +f.percent > 100)) throw new Error(T('err'))
      const { error } = await supabase.from('promotions').insert({ name: f.name.trim(), percent: f.percent === '' ? null : +f.percent, promo_price_amd: f.promo_price_amd === '' ? null : +f.promo_price_amd,
        product_id: f.target === 'product' ? f.product_id : null, category_id: f.target === 'category' ? f.category_id : null, starts_at: s.toISOString(), ends_at: e.toISOString(), is_active: f.is_active }); if (error) throw error
      setF(blank); setMsg(T('saved')); await load() } catch (x: any) { setMsg(`${T('err')}: ${x.message}`) } }
  const toggle = async (r: any) => { await supabase.from('promotions').update({ is_active: !r.is_active }).eq('id', r.id); await load() }
  const del = async (r: any) => { if (confirm(T('confirm_del'))) { await supabase.from('promotions').delete().eq('id', r.id); await load() } }
  const s = (k: string, v: any) => setF({ ...f, [k]: v })
  return <><section className="glass box"><h3>{T('promos')}</h3><div className="grid">
    <label>{T('name')}<input value={f.name} onChange={e => s('name', e.target.value)} /></label>
    <label>{T('percent')}<input type="number" min="0" max="100" value={f.percent} onChange={e => s('percent', e.target.value)} /></label>
    <label>{T('promo_price')}<input type="number" min="0" value={f.promo_price_amd} onChange={e => s('promo_price_amd', e.target.value)} /></label>
    <label>→<select value={f.target} onChange={e => s('target', e.target.value)}><option value="product">{T('product')}</option><option value="category">{T('category')}</option></select></label>
    {f.target === 'product' ? <label>{T('product')}<select value={f.product_id} onChange={e => s('product_id', e.target.value)}><option value="">{T('none')}</option>{prods.map(p => <option key={p.id} value={p.id}>{nm(p.product_translations)}</option>)}</select></label>
      : <label>{T('category')}<select value={f.category_id} onChange={e => s('category_id', e.target.value)}><option value="">{T('none')}</option>{cats.map(c => <option key={c.id} value={c.id}>{nm(c.category_translations)}</option>)}</select></label>}
    <label>{T('start')}<input type="datetime-local" value={f.starts_at} onChange={e => s('starts_at', e.target.value)} /></label>
    <label>{T('end')}<input type="datetime-local" value={f.ends_at} onChange={e => s('ends_at', e.target.value)} /></label>
    <label className="chk"><input type="checkbox" checked={f.is_active} onChange={e => s('is_active', e.target.checked)} />{T('active')}</label></div>
    <div className="acts"><button className="btn-dark" onClick={save}>{T('save')}</button><span role="status">{msg}</span></div></section>
    <section className="glass box"><div className="scrollx"><table><tbody>{rows.map(r => <tr key={r.id}><td>{r.name}</td><td>{r.percent != null ? `-${r.percent}%` : `${r.promo_price_amd} ֏`}</td>
      <td>{r.product_id ? nm(prods.find(p => p.id === r.product_id)?.product_translations) : nm(cats.find(c => c.id === r.category_id)?.category_translations)}</td>
      <td>{new Date(r.starts_at).toLocaleString()} → {new Date(r.ends_at).toLocaleString()}</td><td><button onClick={() => toggle(r)}>{r.is_active ? '●' : '○'}</button><button className="red" onClick={() => del(r)}>🗑︎</button></td></tr>)}</tbody></table></div>
      {!rows.length && <p>{T('none_yet')}</p>}</section></>
}
