import { useCallback, useEffect, useState } from 'react'
import { publicUrl, uploadImage } from '../../lib/auth'
import { adminSupabase as supabase } from '../../lib/supabase'
import type { Ctx } from './Admin'
const LG = ['hy', 'ru', 'en'] as const; const KEYS = ['hero', 'about', 'banner'] as const
export default function HomepageEditor({ T }: Ctx) {
  const [rows, setRows] = useState<Record<string, any>>({}); const [msg, setMsg] = useState('')
  const load = useCallback(async () => { const { data } = await supabase.from('homepage_sections').select('*,homepage_translations(lang,title,body,button_label)')
    setRows(Object.fromEntries((data ?? []).map((r: any) => [r.key, { ...r, tr: Object.fromEntries(LG.map(l => [l, r.homepage_translations.find((t: any) => t.lang === l) ?? { title: '', body: '', button_label: '' }])) }]))) }, [])
  useEffect(() => { void load() }, [load])
  const upd = (k: string, patch: any) => setRows(r => ({ ...r, [k]: { ...r[k], ...patch } }))
  const updTr = (k: string, l: string, patch: any) => setRows(r => ({ ...r, [k]: { ...r[k], tr: { ...r[k].tr, [l]: { ...r[k].tr[l], ...patch } } } }))
  const save = async (k: string) => { setMsg('')
    try { const r = rows[k]
      const { error } = await supabase.from('homepage_sections').update({ is_active: r.is_active, link: r.link || null, image_path: r.image_path || null }).eq('key', k); if (error) throw error
      const { error: e2 } = await supabase.from('homepage_translations').upsert(LG.map(l => ({ section_key: k, lang: l, title: r.tr[l].title, body: r.tr[l].body, button_label: r.tr[l].button_label }))); if (e2) throw e2
      setMsg(`${T('saved')} · ${T(k as any)}`) } catch (e: any) { setMsg(`${T('err')}: ${e.message}`) } }
  const up = async (k: string, f?: File) => { if (!f) return; try { upd(k, { image_path: await uploadImage('homepage-images', f, k) }) } catch (e: any) { setMsg(`${T('err')}: ${e.message === 'type' || e.message === 'size' ? T('err_file') : e.message}`) } }
  return <>{KEYS.filter(k => rows[k]).map(k => { const r = rows[k]; return <section className="glass box" key={k}><h3>{T(k as any)}</h3>
    <div className="grid">{LG.map(l => <div key={l} className="wide" style={{ display: 'contents' }}>
      <label>{T('ttl')} {l.toUpperCase()}<input value={r.tr[l].title ?? ''} onChange={e => updTr(k, l, { title: e.target.value })} /></label>
      <label className="wide">{T('body')} {l.toUpperCase()}<textarea rows={2} value={r.tr[l].body ?? ''} onChange={e => updTr(k, l, { body: e.target.value })} /></label>
      <label>{T('btn')} {l.toUpperCase()}<input value={r.tr[l].button_label ?? ''} onChange={e => updTr(k, l, { button_label: e.target.value })} /></label></div>)}
      <label>{T('link')}<input value={r.link ?? ''} onChange={e => upd(k, { link: e.target.value })} /></label>
      {k !== 'hero' && <label>{T('image')}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => up(k, e.target.files?.[0])} />{r.image_path && <img className="mini" src={publicUrl('homepage-images', r.image_path)} alt="" />}</label>}
      <label className="chk"><input type="checkbox" checked={r.is_active} onChange={e => upd(k, { is_active: e.target.checked })} />{T('active')}</label></div>
    <div className="acts"><button className="btn-dark" onClick={() => save(k)}>{T('save')}</button></div></section> })}
    <p role="status" style={{ color: '#fff' }}>{msg || T('live')}</p></>
}
