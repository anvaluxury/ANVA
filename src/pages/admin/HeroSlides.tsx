import { useCallback, useEffect, useState } from 'react'
import { publicUrl, uploadImage } from '../../lib/auth'
import { adminSupabase as supabase } from '../../lib/supabase'
import { translate } from '../../lib/translate'
import type { Ctx } from './Admin'
import MediaAdjuster from './MediaAdjuster'
const LG = ['hy', 'ru', 'en'] as const; const B = 'homepage-images'
type Tr = { title: string; body: string; button: string }
const tr0 = () => Object.fromEntries(LG.map(l => [l, { title: '', body: '', button: '' }])) as Record<string, Tr>
const blank = () => ({ id: '', image_path: '', link: '#collections', is_active: true, sort_order: 0, data: tr0() })

export default function HeroSlides({ T }: Ctx) {
  const [rows, setRows] = useState<any[]>([]); const [f, setF] = useState<any>(blank()); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const [trash, setTrash] = useState<string[]>([]); const [fresh, setFresh] = useState<string[]>([])   // trash: replaced saved files; fresh: uploaded, not saved yet
  const load = useCallback(async () => { const { data } = await supabase.from('hero_slides').select('*').order('sort_order'); setRows(data ?? []) }, [])
  useEffect(() => { void load() }, [load])
  const run = async (fn: () => Promise<void>, ok = true) => { setBusy(true); setMsg(''); try { await fn(); if (ok) setMsg(T('saved')); await load() } catch (e: any) { setMsg(`${T('err')}: ${e.message === 'type' || e.message === 'size' ? T('err_file') : e.message}`) } finally { setBusy(false) } }
  const edit = (r: any) => { setF({ ...r, data: { ...tr0(), ...(r.data ?? {}) } }); setTrash([]); setFresh([]); scrollTo({ top: 0, behavior: 'smooth' }) }
  const dropFile = async (path: string) => { if (!path) return; if (fresh.includes(path)) { await supabase.storage.from(B).remove([path]); setFresh(x => x.filter(p => p !== path)) } else setTrash(x => [...x, path]) }
  const pick = (file?: File) => file && run(async () => { const p = await uploadImage(B, file, 'hero'); await dropFile(f.image_path); setFresh(x => [...x, p]); setF((x: any) => ({ ...x, image_path: p })) }, false)
  const unpick = async () => { await dropFile(f.image_path); setF({ ...f, image_path: '' }) }
  const cancel = async () => { if (fresh.length) await supabase.storage.from(B).remove(fresh); setF(blank()); setTrash([]); setFresh([]); setMsg('') }
  const save = () => run(async () => {
    const link = (f.link ?? '').trim(); if (link && !/^(#|\/|https:\/\/)/.test(link)) throw new Error('link: #… | /… | https://…')
    const d: Record<string, Tr> = JSON.parse(JSON.stringify(f.data))
    for (const l of ['ru', 'en'] as const) for (const k of ['title', 'body', 'button'] as const) if (!d[l][k].trim() && d.hy[k].trim()) { const t = await translate(d.hy[k], l); if (t) d[l][k] = t }
    const row = { image_path: f.image_path || null, link: link || null, is_active: f.is_active, data: d, sort_order: f.id ? f.sort_order : (rows.reduce((m, r) => Math.max(m, r.sort_order), 0) + 1) }
    const { error } = f.id ? await supabase.from('hero_slides').update(row).eq('id', f.id) : await supabase.from('hero_slides').insert(row); if (error) throw error
    if (trash.length) await supabase.storage.from(B).remove(trash)
    setF(blank()); setTrash([]); setFresh([])
  })
  const del = (r: any) => confirm(T('confirm_del')) && run(async () => { const { error } = await supabase.from('hero_slides').delete().eq('id', r.id); if (error) throw error; if (r.image_path) await supabase.storage.from(B).remove([r.image_path]) })
  const toggle = (r: any) => run(async () => { const { error } = await supabase.from('hero_slides').update({ is_active: !r.is_active }).eq('id', r.id); if (error) throw error }, false)
  const move = (i: number, d: number) => run(async () => { const a = [...rows]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]
    const res = await Promise.all(a.map((r, k) => supabase.from('hero_slides').update({ sort_order: k + 1 }).eq('id', r.id))); const bad = res.find(x => x.error); if (bad?.error) throw bad.error }, false)
  const setTr = (l: string, k: keyof Tr, v: string) => setF({ ...f, data: { ...f.data, [l]: { ...f.data[l], [k]: v } } })
  return <>
    <section className="glass box"><h3>{f.id ? T('edit') : T('new_slide')}</h3><p style={{ opacity: .8, fontSize: 13 }}>{T('slide_hint')}</p>
      <div className="grid">
        {LG.map(l => <div key={l} style={{ display: 'contents' }}>
          <label>{T('ttl')} {l.toUpperCase()}<input value={f.data[l].title} onChange={e => setTr(l, 'title', e.target.value)} /></label>
          <label className="wide">{T('body')} {l.toUpperCase()}<textarea rows={2} value={f.data[l].body} onChange={e => setTr(l, 'body', e.target.value)} /></label>
          <label>{T('btn')} {l.toUpperCase()}<input value={f.data[l].button} onChange={e => setTr(l, 'button', e.target.value)} /></label></div>)}
        <label>{T('link')}<input value={f.link ?? ''} onChange={e => setF({ ...f, link: e.target.value })} placeholder="#collections" /></label>
        <label className="chk"><input type="checkbox" checked={f.is_active} onChange={e => setF({ ...f, is_active: e.target.checked })} />{T('active')}</label>
        <label className="wide">{T('image')}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
          {f.image_path && <><span className="slide-prev"><img src={publicUrl(B, f.image_path)} alt="" /><button type="button" className="red" onClick={unpick}>🗑︎ {T('rm_img')}</button></span><MediaAdjuster bucket={B} path={f.image_path} src={publicUrl(B, f.image_path)} kind="image" label="Գլխավոր սլայդ" aspect="16 / 9" /></>}</label>
      </div>
      <div className="acts"><button className="btn-dark" disabled={busy} onClick={save}>{busy ? '…' : T('save')}</button>{(f.id || f.image_path) && <button className="btn-light" onClick={cancel}>{T('cancel')}</button>}<span role="status">{msg}</span></div>
    </section>
    <section className="glass box"><table><tbody>{rows.map((r, i) => { const t0 = r.data?.hy ?? r.data?.en ?? {}; return <tr key={r.id}>
      <td>{r.image_path ? <img className="slide-th" src={publicUrl(B, r.image_path)} alt="" /> : <span className="slide-th empty">ANVA</span>}</td>
      <td>{t0.title || '—'}</td><td>{r.is_active ? '●' : '○'}</td>
      <td><button disabled={busy || i === 0} onClick={() => move(i, -1)}>↑</button><button disabled={busy || i === rows.length - 1} onClick={() => move(i, 1)}>↓</button><button onClick={() => toggle(r)}>{r.is_active ? '○' : '●'}</button><button onClick={() => edit(r)}>✎</button><button className="red" onClick={() => del(r)}>🗑︎</button></td></tr> })}</tbody></table>{!rows.length && <p>{T('empty')}</p>}</section>
  </>
}
