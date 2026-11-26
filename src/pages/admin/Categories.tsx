import { useCallback, useEffect, useState } from 'react'
import { publicUrl } from '../../lib/auth'
import MediaField from './editor/MediaField'
import { adminSupabase as supabase } from '../../lib/supabase'
import { translate } from '../../lib/translate'
import { uuid } from '../../lib/uuid'
import type { Ctx } from './Admin'
const LG = ['hy', 'ru', 'en'] as const
const blank = { id: '', slug: '', image_path: '', sort_order: 0, is_active: true, names: { hy: '', ru: '', en: '' } as Record<string, string> }
export default function Categories({ T, lang }: Ctx) {
  const [rows, setRows] = useState<any[]>([]); const [f, setF] = useState<any>(blank); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const load = useCallback(async () => { const { data } = await supabase.from('categories').select('*,category_translations(lang,name)').order('sort_order'); setRows(data ?? []) }, [])
  useEffect(() => { void load() }, [load])
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(''); try { await fn(); setMsg(T('saved')); await load() } catch (e: any) { setMsg(`${T('err')}: ${e.message === 'type' || e.message === 'size' ? T('err_file') : e.message}`) } finally { setBusy(false) } }
  const edit = (r: any) => setF({ id: r.id, slug: r.slug, image_path: r.image_path ?? '', sort_order: r.sort_order, is_active: r.is_active, names: Object.fromEntries(LG.map(l => [l, r.category_translations.find((t: any) => t.lang === l)?.name ?? ''])) })
  const save = () => run(async () => {
    if (!f.names.hy.trim()) throw new Error('HY *')
    const slug = f.slug.trim() || `c-${uuid().slice(0, 8)}`            // slug is generated automatically when left empty
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(T('slug'))
    const names: Record<string, string> = { ...f.names }
    for (const l of ['ru', 'en'] as const) if (!names[l].trim()) { const t = await translate(names.hy, l); if (t) names[l] = t }   // auto-translate from Armenian
    const row = { slug, image_path: f.image_path || null, sort_order: Number(f.sort_order) || 0, is_active: f.is_active }
    const q = f.id ? supabase.from('categories').update(row).eq('id', f.id).select('id').single() : supabase.from('categories').insert(row).select('id').single()
    const { data, error } = await q; if (error) throw error
    const { error: e2 } = await supabase.from('category_translations').upsert(LG.filter(l => names[l].trim()).map(l => ({ category_id: data.id, lang: l, name: names[l].trim() }))); if (e2) throw e2
    setF(blank)
  })
  const del = (r: any) => confirm(T('confirm_del')) && run(async () => { const { error } = await supabase.from('categories').delete().eq('id', r.id); if (error) throw error })
  return <>
    <section className="glass box"><h3>{f.id ? T('edit') : T('new_cat')}</h3>
      <div className="grid">
        {LG.map(l => <label key={l}>{T('name')} {l.toUpperCase()}{l === 'hy' ? ' *' : ''}<input value={f.names[l]} onChange={e => setF({ ...f, names: { ...f.names, [l]: e.target.value } })} /></label>)}
        <label>{T('slug')}<input value={f.slug} onChange={e => setF({ ...f, slug: e.target.value.toLowerCase() })} /></label>
        <label>{T('order')}<input type="number" value={f.sort_order} onChange={e => setF({ ...f, sort_order: e.target.value })} /></label>
        <label className="chk"><input type="checkbox" checked={f.is_active} onChange={e => setF({ ...f, is_active: e.target.checked })} />{T('active')}</label>
        <MediaField lang={lang} label={T('image')} bucket="category-images" folder={f.slug || 'new'} ratio="4:5" path={f.image_path} onChange={p => setF({ ...f, image_path: p })} />
      </div>
      <div className="acts"><button className="btn-dark" disabled={busy} onClick={save}>{busy ? '…' : T('save')}</button>{f.id && <button className="btn-light" onClick={() => setF(blank)}>{T('cancel')}</button>}<span role="status">{msg}</span></div>
    </section>
    <section className="glass box"><table><tbody>{rows.map(r => <tr key={r.id}>
      <td>{r.image_path && <img className="mini" src={publicUrl('category-images', r.image_path)} alt="" />}</td><td>{r.category_translations.map((t: any) => t.name).join(' / ')}</td><td>{r.sort_order}</td><td>{r.is_active ? '●' : '○'}</td>
      <td><button onClick={() => edit(r)}>✎</button><button className="red" onClick={() => del(r)}>🗑︎</button></td></tr>)}</tbody></table>{!rows.length && <p>{T('empty')}</p>}</section></>
}
