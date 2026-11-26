import { useEffect, useState } from 'react'
import { publicUrl } from '../../lib/auth'
import { adminSupabase as supabase } from '../../lib/supabase'
import type { HeroCfg, Slide } from '../../components/HeroMedia'
import type { Ctx } from './Admin'

const L: Record<string, Record<string, string>> = {
  hy: { t: 'Գլխավոր էջի անիմացիա / տեսանյութ', add: 'Ավելացնել տեսանյութ կամ նկար', hint: 'MP4/WebM մինչև 50 ՄԲ, կամ JPG/PNG/WebP։ Խորհուրդ՝ 1920×1080, առանց ձայնի, 10–20 վրկ։', auto: 'Ավտոմատ փոխել սլայդները', sec: 'Վայրկյան (նկարի համար)', ov: 'Մթության շերտ', up: 'Վերև', down: 'Ներքև', del: 'Ջնջել', none: 'Սլայդ չկա․ կայքը ցույց է տալիս լռելյայն շողշողացող ֆոնը։', bad: 'Թույլատրվում են MP4, WebM, JPG, PNG, WebP մինչև 50 ՄԲ', saved: 'Պահպանվեց' },
  ru: { t: 'Анимация / видео на главной', add: 'Добавить видео или фото', hint: 'MP4/WebM до 50 МБ или JPG/PNG/WebP. Лучше 1920×1080, без звука, 10–20 с.', auto: 'Автопереключение слайдов', sec: 'Секунд (для фото)', ov: 'Затемнение', up: 'Выше', down: 'Ниже', del: 'Удалить', none: 'Слайдов нет — показывается стандартный мерцающий фон.', bad: 'Разрешены MP4, WebM, JPG, PNG, WebP до 50 МБ', saved: 'Сохранено' },
  en: { t: 'Homepage animation / video', add: 'Add video or image', hint: 'MP4/WebM up to 50 MB, or JPG/PNG/WebP. Best: 1920×1080, no audio, 10–20 s.', auto: 'Auto-advance slides', sec: 'Seconds (images)', ov: 'Dark overlay', up: 'Up', down: 'Down', del: 'Delete', none: 'No slides — the default shimmer background is shown.', bad: 'Allowed: MP4, WebM, JPG, PNG, WebP up to 50 MB', saved: 'Saved' },
}
const OK: Record<string, 'video' | 'image'> = { 'video/mp4': 'video', 'video/webm': 'video', 'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image' }
const EMPTY: HeroCfg = { slides: [], autoplay: true, interval: 6, overlay: 45 }

export default function HeroMediaEditor({ lang, T }: Pick<Ctx, 'lang' | 'T'>) {
  const t = L[lang] ?? L.en
  const [cfg, setCfg] = useState<HeroCfg>(EMPTY); const [removed, setRemoved] = useState<string[]>([])
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { void supabase.from('site_settings').select('value').eq('key', 'hero_media').maybeSingle().then(({ data }) => setCfg({ ...EMPTY, ...(data?.value ?? {}) })) }, [])

  const upload = async (f?: File) => {
    if (!f) return
    const kind = OK[f.type]; if (!kind || f.size > 50 * 1024 * 1024) return setMsg(`${T('err')}: ${t.bad}`)
    setBusy(true); setMsg('')
    const path = `hero/${crypto.randomUUID()}.${f.name.split('.').pop()?.toLowerCase() ?? 'bin'}`
    const { error } = await supabase.storage.from('hero-media').upload(path, f, { contentType: f.type, cacheControl: '31536000' })
    setBusy(false)
    if (error) return setMsg(`${T('err')}: ${error.message}`)
    setCfg(c => ({ ...c, slides: [...c.slides, { type: kind, path }] }))
  }
  const move = (k: number, d: number) => setCfg(c => { const s = [...c.slides]; const j = k + d; if (j < 0 || j >= s.length) return c; [s[k], s[j]] = [s[j], s[k]]; return { ...c, slides: s } })
  const del = (k: number) => setCfg(c => { setRemoved(r => [...r, c.slides[k].path]); return { ...c, slides: c.slides.filter((_, x) => x !== k) } })
  const save = async () => {
    setBusy(true); setMsg('')
    const value: HeroCfg = { ...cfg, interval: Math.min(30, Math.max(3, Number(cfg.interval) || 6)), overlay: Math.min(80, Math.max(0, Number(cfg.overlay) || 0)) }
    const { error } = await supabase.from('site_settings').upsert({ key: 'hero_media', value, updated_at: new Date().toISOString() })
    if (!error && removed.length) { await supabase.storage.from('hero-media').remove(removed); setRemoved([]) }
    setBusy(false); setMsg(error ? `${T('err')}: ${error.message}` : t.saved)
  }
  return <section className="glass box"><h3>{t.t}</h3>
    <p style={{ margin: '0 0 14px', opacity: .75, fontSize: 13 }}>{t.hint}</p>
    {cfg.slides.length === 0 && <p style={{ opacity: .7 }}>{t.none}</p>}
    <div className="thumbrow">{cfg.slides.map((s: Slide, k) => <figure key={s.path} style={{ width: 150 }}>
      {s.type === 'video' ? <video src={publicUrl('hero-media', s.path) + '#t=0.1'} muted playsInline preload="metadata" style={{ width: 150, height: 90, objectFit: 'cover', borderRadius: 12 }} /> : <img src={publicUrl('hero-media', s.path)} alt="" style={{ width: 150, height: 90, objectFit: 'cover', borderRadius: 12 }} />}
      <figcaption><button aria-label={t.up} onClick={() => move(k, -1)}>←</button><button aria-label={t.down} onClick={() => move(k, 1)}>→</button><button className="red" aria-label={t.del} onClick={() => del(k)}>✕</button></figcaption></figure>)}</div>
    <div className="grid">
      <label className="wide">{t.add}<input type="file" accept="video/mp4,video/webm,image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = '' }} /></label>
      <label className="chk"><input type="checkbox" checked={cfg.autoplay} onChange={e => setCfg({ ...cfg, autoplay: e.target.checked })} />{t.auto}</label>
      <label>{t.sec}<input type="number" min={3} max={30} value={cfg.interval} onChange={e => setCfg({ ...cfg, interval: Number(e.target.value) })} /></label>
      <label>{t.ov}: {cfg.overlay}%<input type="range" min={0} max={80} value={cfg.overlay} onChange={e => setCfg({ ...cfg, overlay: Number(e.target.value) })} /></label>
    </div>
    <div className="acts"><button className="btn-dark" disabled={busy} onClick={save}>{busy ? '…' : T('save')}</button><span role="status">{msg}</span></div></section>
}
