import { useCallback, useEffect, useMemo, useState } from 'react'
import { publicUrl, uploadImage } from '../../lib/auth'
import { adminSupabase as supabase } from '../../lib/supabase'
import { translate } from '../../lib/translate'
import { uuid } from '../../lib/uuid'
import type { Ctx } from './Admin'
import MediaAdjuster from './MediaAdjuster'
import ImageEditor from './editor/ImageEditor'
const LG = ['hy', 'ru', 'en'] as const
const blank = () => ({ id: uuid(), isNew: true, sku: '', category_id: '', price_amd: '', old_price_amd: '', discount_percent: '0', material: '', purity: '', weight_g: '',
  status: 'available', is_featured: false, is_new: false, is_active: true, sort_order: '0',
  names: { hy: '', ru: '', en: '' } as Record<string, string>, descs: { hy: '', ru: '', en: '' } as Record<string, string>, images: [] as any[], pending: [] as { file: File; url: string }[] })
const OK = ['image/jpeg', 'image/png', 'image/webp']; const MAX_MB = 5; const MAX_IMAGES = 30
const HINT: Record<string, string> = { hy: 'Նկարները կվերբեռնվեն «Պահպանել» սեղմելիս։', ru: 'Фото загрузятся при нажатии «Сохранить».', en: 'Images upload when you click Save.' }
const MSG: Record<string, Record<'name' | 'price' | 'disc' | 'tr', string>> = {
  hy: { name: 'Լրացրեք ապրանքի անունը հայերենով։', price: 'Լրացրեք ճիշտ գինը (թվով)։', disc: 'Զեղչը պետք է լինի 0-ից 100։', tr: 'Ավտոմատ թարգմանությունը հասանելի չէ. ապրանքը պահպանվեց հայերենով, թարգմանությունը կարող եք լրացնել ձեռքով։' },
  ru: { name: 'Введите название товара на армянском.', price: 'Введите корректную цену (числом).', disc: 'Скидка должна быть от 0 до 100.', tr: 'Автоперевод недоступен: товар сохранён на армянском, перевод можно ввести вручную.' },
  en: { name: 'Enter the product name in Armenian.', price: 'Enter a valid price (number).', disc: 'Discount must be between 0 and 100.', tr: 'Auto-translation is unavailable: the product was saved in Armenian; you can add translations manually.' } }
const TR_LABEL: Record<string, string> = { hy: 'Թարգմանություններ RU / EN (ավտոմատ, դատարկը կլրացվի պահելիս)', ru: 'Переводы RU / EN (авто; пустое заполнится при сохранении)', en: 'Translations RU / EN (auto; empty ones are filled on save)' }
const AUTO: Record<string, string> = { hy: 'Թարգմանել ավտոմատ', ru: 'Перевести автоматически', en: 'Auto-translate' }
const num = (s: string) => (s.trim() === '' ? null : Number(s))
export default function Products({ T, lang }: Ctx) {
  const [rows, setRows] = useState<any[]>([]); const [cats, setCats] = useState<any[]>([]); const [f, setF] = useState<any>(blank()); const [q, setQ] = useState('')
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const [imageToEdit, setImageToEdit] = useState<File | null>(null); const [editQueue, setEditQueue] = useState<File[]>([])
  const load = useCallback(async () => {
    const [p, c] = await Promise.all([supabase.from('products').select('*,product_translations(lang,name,description),product_images(id,path,sort_order,is_main)').order('sort_order').order('created_at', { ascending: false }),
      supabase.from('categories').select('id,category_translations(lang,name)').order('sort_order')])
    setRows(p.data ?? []); setCats(c.data ?? [])
  }, [])
  useEffect(() => { void load() }, [load])
  const run = async (fn: () => Promise<void | string>, ok = true) => { setBusy(true); setMsg(''); try { const warn = await fn(); if (ok) setMsg(warn ? `${T('saved')} — ${warn}` : T('saved')); await load() } catch (e: any) { setMsg(`${T('err')}: ${e.message === 'type' || e.message === 'size' ? T('err_file') : e.message}`) } finally { setBusy(false) } }
  const nm = (r: any) => (r.product_translations.find((t: any) => t.lang === lang) ?? r.product_translations[0])?.name ?? r.sku ?? '—'
  const cname = (c: any) => (c.category_translations.find((t: any) => t.lang === lang) ?? c.category_translations[0])?.name
  const shown = useMemo(() => rows.filter(r => !q || r.product_translations.some((t: any) => t.name.toLowerCase().includes(q.toLowerCase())) || r.sku?.toLowerCase().includes(q.toLowerCase())), [rows, q])

  const clearPending = () => f.pending.forEach((p: any) => URL.revokeObjectURL(p.url))
  useEffect(() => () => clearPending(), []) // eslint-disable-line
  const edit = (r: any) => { clearPending(); setF({ ...r, isNew: false, pending: [], sku: r.sku ?? '', category_id: r.category_id ?? '', price_amd: String(r.price_amd), old_price_amd: r.old_price_amd ?? '', discount_percent: String(r.discount_percent ?? 0), weight_g: r.weight_g ?? '', material: r.material ?? '', purity: r.purity ?? '', sort_order: String(r.sort_order),
    names: Object.fromEntries(LG.map(l => [l, r.product_translations.find((t: any) => t.lang === l)?.name ?? ''])), descs: Object.fromEntries(LG.map(l => [l, r.product_translations.find((t: any) => t.lang === l)?.description ?? ''])),
    images: [...r.product_images].sort((a: any, b: any) => a.sort_order - b.sort_order) }) }
  const reset = () => { clearPending(); setF(blank()) }
  const refreshImgs = async (id = f.id) => { const { data } = await supabase.from('product_images').select('*').eq('product_id', id).order('sort_order'); setF((x: any) => ({ ...x, images: data ?? [] })) }
  // keeps DB order = array order; the first image is always the main one
  const renumber = async (list: any[]) => { const res = await Promise.all(list.map((im, i) => supabase.from('product_images').update({ sort_order: i, is_main: i === 0 }).eq('id', im.id))); const bad = res.find(r => r.error); if (bad?.error) throw bad.error }
  const save = () => run(async () => {
    const price = Number(f.price_amd); const disc = Number(f.discount_percent || 0)
    if (!f.names.hy.trim()) throw new Error(MSG[lang].name)
    if (f.price_amd === '' || !Number.isFinite(price) || price < 0) throw new Error(MSG[lang].price)
    if (!Number.isFinite(disc) || disc < 0 || disc > 100) throw new Error(MSG[lang].disc)
    if (f.is_featured) await supabase.from('products').update({ is_featured: false }).eq('is_featured', true).neq('id', f.id)
    const row = { id: f.id, sku: f.sku.trim() || null, category_id: f.category_id || null, price_amd: price, old_price_amd: num(String(f.old_price_amd)), discount_percent: disc, material: f.material || null, purity: f.purity || null,
      weight_g: num(String(f.weight_g)), status: f.status, is_featured: f.is_featured, is_new: f.is_new, is_active: f.is_active, sort_order: Number(f.sort_order) || 0, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('products').upsert(row); if (error) throw error
    // Armenian is the source; RU/EN are auto-translated when left empty (manual text is never overwritten)
    const names: Record<string, string> = { ...f.names }; const descs: Record<string, string> = { ...f.descs }; let trFailed = false
    for (const l of ['ru', 'en'] as const) {
      if (!names[l].trim()) { const t = await translate(names.hy, l); if (t) names[l] = t; else trFailed = true }
      if (!descs[l].trim() && descs.hy.trim()) { const t = await translate(descs.hy, l); if (t) descs[l] = t; else trFailed = true }
    }
    const { error: e2 } = await supabase.from('product_translations').upsert(LG.filter(l => names[l].trim()).map(l => ({ product_id: f.id, lang: l, name: names[l].trim(), description: descs[l].trim() || null }))); if (e2) throw e2
    setF((x: any) => ({ ...x, names, descs }))
    // product is saved -> now upload the queued images; a failed file stays in the queue so nothing is lost
    const queue: { file: File; url: string }[] = [...f.pending]; const start = f.images.length; let done = 0
    try {
      for (const item of queue) {
        setMsg(`${done + 1}/${queue.length} …`)
        const path = await uploadImage('product-images', item.file, f.id)
        const { error: e3 } = await supabase.from('product_images').insert({ product_id: f.id, path, sort_order: start + done, is_main: start + done === 0 })
        if (e3) { await supabase.storage.from('product-images').remove([path]); throw e3 }
        URL.revokeObjectURL(item.url); done++
      }
    } finally {
      setF((x: any) => ({ ...x, isNew: false, pending: queue.slice(done) }))
      await refreshImgs(f.id)
    }
    return trFailed ? MSG[lang].tr : undefined
  })
  const autoTr = async () => {
    setBusy(true); setMsg('…'); const names: Record<string, string> = { ...f.names }; const descs: Record<string, string> = { ...f.descs }; let fail = false
    for (const l of ['ru', 'en'] as const) {
      const n = await translate(f.names.hy, l); if (n) names[l] = n; else fail = true
      if (f.descs.hy.trim()) { const d = await translate(f.descs.hy, l); if (d) descs[l] = d; else fail = true }
    }
    setF((x: any) => ({ ...x, names, descs })); setMsg(fail ? MSG[lang].tr : ''); setBusy(false)
  }
  const addFiles = (files: FileList | null) => {
    if (!files) return; let bad = false
    const remaining = Math.max(0, MAX_IMAGES - f.images.length - f.pending.length)
    const add = Array.from(files).filter(file => { const ok = OK.includes(file.type) && file.size <= MAX_MB * 1024 * 1024; if (!ok) bad = true; return ok }).slice(0, remaining)
    if (add.length) { if (!imageToEdit) { setImageToEdit(add[0]); setEditQueue(q => [...q, ...add.slice(1)]) } else setEditQueue(q => [...q, ...add]) }
    setMsg(bad ? T('err_file') : '')
  }
  const nextEditedImage = () => { setImageToEdit(editQueue[0] ?? null); setEditQueue(q => q.slice(1)) }
  const acceptEditedImage = (blob: Blob) => {
    if (!imageToEdit) return
    const file = new File([blob], `${imageToEdit.name.replace(/\.[^.]+$/, '')}-edited.webp`, { type: blob.type || 'image/webp' })
    setF((x: any) => ({ ...x, pending: [...x.pending, { file, url: URL.createObjectURL(file) }] }))
    nextEditedImage()
  }
  const swap = <A,>(arr: A[], i: number, d: number) => { const j = i + d; if (j < 0 || j >= arr.length) return arr; const n = [...arr]; [n[i], n[j]] = [n[j], n[i]]; return n }
  const toFront = <A,>(arr: A[], i: number) => [arr[i], ...arr.filter((_, k) => k !== i)]
  const dropPending = (i: number) => { URL.revokeObjectURL(f.pending[i].url); setF((x: any) => ({ ...x, pending: x.pending.filter((_: any, k: number) => k !== i) })) }
  const movePending = (i: number, d: number) => setF((x: any) => ({ ...x, pending: swap(x.pending, i, d) }))
  const frontPending = (i: number) => setF((x: any) => ({ ...x, pending: toFront(x.pending, i) }))   // uploaded first -> becomes main if no saved image exists
  const delImg = (im: any) => confirm(T('confirm_del')) && run(async () => {
    const { error } = await supabase.from('product_images').delete().eq('id', im.id); if (error) throw error
    await supabase.storage.from('product-images').remove([im.path])
    const rest = f.images.filter((x: any) => x.id !== im.id); await renumber(rest); await refreshImgs()
  }, false)
  const moveImg = (i: number, d: number) => run(async () => { const list = swap<any>(f.images, i, d); await renumber(list); await refreshImgs() }, false)
  const mainImg = (i: number) => run(async () => { const list = toFront<any>(f.images, i); await renumber(list); await refreshImgs() }, false)
  const toggle = (r: any, k: 'is_active' | 'is_featured') => run(async () => {
    if (k === 'is_featured' && !r.is_featured) await supabase.from('products').update({ is_featured: false }).eq('is_featured', true)
    const { error } = await supabase.from('products').update({ [k]: !r[k] }).eq('id', r.id); if (error) throw error }, false)
  const del = (r: any) => confirm(T('confirm_del')) && run(async () => {
    const paths = r.product_images.map((i: any) => i.path); if (paths.length) await supabase.storage.from('product-images').remove(paths)
    const { error } = await supabase.from('products').delete().eq('id', r.id); if (error) throw error; if (f.id === r.id) reset() }, false)
  const dup = (r: any) => run(async () => { const id = uuid(); const { id: _i, product_translations, product_images, created_at, updated_at, sku, is_featured, ...rest } = r
    const { error } = await supabase.from('products').insert({ ...rest, id, sku: null, is_featured: false, is_active: false }); if (error) throw error
    await supabase.from('product_translations').insert(product_translations.map((t: any) => ({ ...t, product_id: id, name: `${t.name} (copy)` }))) }, false)
  const set = (k: string, v: any) => setF({ ...f, [k]: v })

  return <>
    <section className="glass box"><h3>{f.isNew ? T('add') : T('edit')}</h3>
      <div className="grid">
        <label>{T('name')} HY *<input value={f.names.hy} onChange={e => set('names', { ...f.names, hy: e.target.value })} /></label>
        <label className="wide">{T('desc')} HY<textarea rows={2} value={f.descs.hy} onChange={e => set('descs', { ...f.descs, hy: e.target.value })} /></label>
        <details className="tr-box"><summary>{TR_LABEL[lang]}</summary><div className="grid">
          {(['ru', 'en'] as const).map(l => <label key={l}>{T('name')} {l.toUpperCase()}<input value={f.names[l]} onChange={e => set('names', { ...f.names, [l]: e.target.value })} /></label>)}
          {(['ru', 'en'] as const).map(l => <label key={l + 'd'} className="wide">{T('desc')} {l.toUpperCase()}<textarea rows={2} value={f.descs[l]} onChange={e => set('descs', { ...f.descs, [l]: e.target.value })} /></label>)}
          <button type="button" className="btn-light sm" disabled={busy || !f.names.hy.trim()} onClick={autoTr}>↻ {AUTO[lang]}</button></div></details>
        <label>{T('price')} *<input type="number" min="0" value={f.price_amd} onChange={e => set('price_amd', e.target.value)} /></label>
        <label>{T('old')}<input type="number" min="0" value={f.old_price_amd} onChange={e => set('old_price_amd', e.target.value)} /></label>
        <label>{T('discount')}<input type="number" min="0" max="100" value={f.discount_percent} onChange={e => set('discount_percent', e.target.value)} /></label>
        <label>{T('category')}<select value={f.category_id} onChange={e => set('category_id', e.target.value)}><option value="">{T('none')}</option>{cats.map(c => <option key={c.id} value={c.id}>{cname(c)}</option>)}</select></label>
        <label>{T('material')}<input value={f.material} onChange={e => set('material', e.target.value)} /></label>
        <label>{T('purity')}<input value={f.purity} onChange={e => set('purity', e.target.value)} /></label>
        <label>{T('weight')}<input type="number" min="0" step="0.01" value={f.weight_g} onChange={e => set('weight_g', e.target.value)} /></label>
        <label>{T('sku')}<input value={f.sku} onChange={e => set('sku', e.target.value)} /></label>
        <label>{T('status')}<select value={f.status} onChange={e => set('status', e.target.value)}>{(['available', 'made_to_order', 'sold_out'] as const).map(s => <option key={s} value={s}>{T(s)}</option>)}</select></label>
        <label>{T('order')}<input type="number" value={f.sort_order} onChange={e => set('sort_order', e.target.value)} /></label>
        <label className="chk"><input type="checkbox" checked={f.is_featured} onChange={e => set('is_featured', e.target.checked)} />{T('featured')}</label>
        <label className="chk"><input type="checkbox" checked={f.is_new} onChange={e => set('is_new', e.target.checked)} />{T('is_new')}</label>
        <label className="chk"><input type="checkbox" checked={f.is_active} onChange={e => set('is_active', e.target.checked)} />{T('active')}</label>
      </div>
      <div className="acts"><button className="btn-dark" disabled={busy} onClick={save}>{busy ? '…' : T('save')}</button>{!f.isNew && <button className="btn-light" onClick={reset}>{T('cancel')}</button>}<span role="status">{msg}</span></div>
      <div className="imgs"><h4>{T('images')} ({f.images.length + f.pending.length})</h4><p className="muted product-image-order-hint">{lang === 'hy' ? '1-ին լուսանկար՝ զարդը սովորական ֆոնի վրա։ 2-րդ լուսանկար՝ նույն զարդը մարդու վրա։ Առաջին երկու լուսանկարների հերթականությունը փոխեք սլաքներով․ կայքում երկրորդը կերևա սահուն անցումով։' : lang === 'ru' ? '1-е фото — украшение на обычном фоне. 2-е фото — то же украшение на модели. Порядок первых двух фото задайте стрелками; на сайте второе будет появляться плавно.' : 'Photo 1: the jewelry on a plain background. Photo 2: the same jewelry worn by a model. Use the arrows to order the first two photos; the second appears with a smooth transition.'}</p>
        <div className="thumbrow">
          {f.images.map((im: any, i: number) => <figure key={im.id}><img src={publicUrl('product-images', im.path)} alt="" />
            <figcaption><button type="button" title="←" disabled={busy || i === 0} onClick={() => moveImg(i, -1)}>←</button><button type="button" title="→" disabled={busy || i === f.images.length - 1} onClick={() => moveImg(i, 1)}>→</button>
              <button type="button" title={T('main')} disabled={busy} onClick={() => mainImg(i)}>{i === 0 ? '★' : '☆'}</button><button type="button" className="red" title={T('del')} disabled={busy} onClick={() => delImg(im)}>🗑︎</button></figcaption><MediaAdjuster bucket="product-images" path={im.path} src={publicUrl('product-images', im.path)} kind="image" label={lang === 'hy' ? 'Ապրանքի նկար' : lang === 'ru' ? 'Фото товара' : 'Product photo'} aspect="4 / 5" /></figure>)}
          {f.pending.map((p: any, i: number) => <figure key={p.url} style={{ opacity: .85 }}><img src={p.url} alt="" style={{ outline: '2px dashed var(--steel)', outlineOffset: -2 }} />
            <figcaption><button type="button" title="←" disabled={busy || i === 0} onClick={() => movePending(i, -1)}>←</button><button type="button" title="→" disabled={busy || i === f.pending.length - 1} onClick={() => movePending(i, 1)}>→</button>
              <button type="button" title={T('main')} disabled={busy} onClick={() => frontPending(i)}>{f.images.length === 0 && i === 0 ? '★' : '☆'}</button><button type="button" className="red" title={T('del')} disabled={busy} onClick={() => dropPending(i)}>✕</button></figcaption></figure>)}
        </div>
        <label className="drop">{T('upload')}<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { addFiles(e.target.files); e.target.value = '' }} /></label>
        {f.pending.length > 0 && <small>{HINT[lang]}</small>}
      </div>
      {imageToEdit && <ImageEditor lang={lang} source={imageToEdit} defaultRatio="4:5" onClose={nextEditedImage} onSave={async blob => acceptEditedImage(blob)} />}
    </section>
    <section className="glass box"><div className="bar"><h3>{T('list')}</h3><input type="search" placeholder={T('search')} value={q} onChange={e => setQ(e.target.value)} /></div>
      <div className="scrollx"><table><tbody>{shown.map(r => { const main = [...r.product_images].sort((a: any, b: any) => (b.is_main - a.is_main) || a.sort_order - b.sort_order)[0]; return <tr key={r.id}>
        <td>{main && <img className="mini" src={publicUrl('product-images', main.path)} alt="" />}</td><td>{nm(r)}</td><td>{Number(r.price_amd).toLocaleString()} ֏</td><td>{r.discount_percent > 0 && <span className="pill-pink">-{Math.round(r.discount_percent)}%</span>}</td><td>{T(r.status)}</td>
        <td><button title={T('active')} onClick={() => toggle(r, 'is_active')}>{r.is_active ? '●' : '○'}</button><button title={T('featured')} onClick={() => toggle(r, 'is_featured')}>{r.is_featured ? '★' : '☆'}</button>
          <button title={T('dup')} onClick={() => dup(r)}>⧉</button><button title={T('edit')} onClick={() => { edit(r); scrollTo({ top: 0, behavior: 'smooth' }) }}>✎</button><button className="red" title={T('del')} onClick={() => del(r)}>🗑︎</button></td></tr> })}</tbody></table></div>
      {!shown.length && <p>{T('empty')}</p>}</section></>
}
