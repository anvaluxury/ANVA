import { useRef, useState } from 'react'
import type { Lang } from '../../../../supabase/functions/auto-translate'
import { E } from '../../../i18n/editor'
import { publicUrl } from '../../../lib/auth'
import { HERO_TYPES, MAX_HERO, uploadBlob } from '../../../lib/media'
import type { Slide } from '../../../lib/siteConfig'
import ImageEditor from './ImageEditor'
import VideoTrimmer from './VideoTrimmer'

type Props = { lang: Lang; slides: Slide[]; onChange: (s: Slide[]) => void; hint?: string; title: string }

/** Slide list for one device (desktop or mobile): add / reorder / remove, crop images, trim videos into new MP4 files. */
export default function HeroMediaPanel({ lang, slides, onChange, hint, title }: Props) {
  const e = (k: Parameters<typeof E>[1]) => E(lang, k)
  const input = useRef<HTMLInputElement>(null); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const [trim, setTrim] = useState<number | null>(null); const [crop, setCrop] = useState<number | null>(null); const [newImage, setNewImage] = useState<File | null>(null)
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= slides.length) return; const n = [...slides]; [n[i], n[j]] = [n[j], n[i]]; onChange(n) }
  const add = async (f?: File) => {
    if (!f) return; const type = HERO_TYPES[f.type]; if (!type || f.size > MAX_HERO) return setMsg(e('bad_hero')); setMsg(''); setBusy(true)
    try { if (type === 'image') { setNewImage(f); return } const path = await uploadBlob('hero-media', f, 'hero', MAX_HERO); onChange([...slides, { type, path }]) } catch (x) { setMsg(`${e('err')}: ${x instanceof Error ? x.message : String(x)}`) } finally { setBusy(false) }
  }
  return (
    <div className="hmp">
      <h4>{title}</h4>{hint && <small className="muted">{hint}</small>}<small className="muted hmp-dimension-hint">{lang === 'hy' ? 'Նկարի համար «Խմբագրել» պատուհանում ընտրեք «Հատուկ» հարաբերակցությունը և W × H չափերը։ Տեսանյութի ցուցադրվող հատվածի լայնությունն ու բարձրությունը կարգավորեք ներքևի «Դասավորություն» բաժնում՝ առանձին համակարգչի և հեռախոսի համար։ Տեսանյութի սկզբնական ֆայլը չի աղավաղվում։' : lang === 'ru' ? 'Для изображения задайте свой формат W × H в редакторе. Размер области показа видео настройте ниже в разделе «Макет» отдельно для компьютера и телефона; исходный видеофайл не искажается.' : 'Set a custom W × H ratio for images in the image editor. Adjust the video display area in the Layout section below, separately for desktop and mobile; the original video file is not distorted.'}</small>
      <ol className="hmp-list">{slides.map((s, i) => { const u = publicUrl('hero-media', s.path); return (
        <li key={s.path + i}>
          <div className="hmp-thumb">{s.type === 'video' ? <video src={`${u}#t=0.1`} muted playsInline preload="metadata" /> : <img src={u} alt="" />}<em>{s.type === 'video' ? 'MP4' : 'IMG'}</em></div>
          <div className="mf-btns">
            <button type="button" className="btn-light sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Up">↑</button>
            <button type="button" className="btn-light sm" onClick={() => move(i, 1)} disabled={i === slides.length - 1} aria-label="Down">↓</button>
            {s.type === 'video' ? <button type="button" className="btn-light sm" onClick={() => setTrim(i)} disabled={!s.path.endsWith('.mp4')} title={s.path.endsWith('.mp4') ? '' : 'MP4 only'}>{e('trim')}</button>
              : <button type="button" className="btn-light sm" onClick={() => setCrop(i)}>{e('edit_img')}</button>}
            <button type="button" className="btn-light sm danger" onClick={() => onChange(slides.filter((_, k) => k !== i))}>{e('remove')}</button>
          </div></li>) })}</ol>
      <button type="button" className="btn-dark sm" onClick={() => input.current?.click()} disabled={busy}>{busy ? e('saving') : `+ ${e('add_media')}`}</button>
      <input ref={input} type="file" hidden accept={Object.keys(HERO_TYPES).join(',')} onChange={ev => { void add(ev.target.files?.[0]); ev.target.value = '' }} />
      <small className="muted">{e('file_kept')}</small>
      {msg && <p className="msg error" role="alert">{msg}</p>}
      {trim !== null && slides[trim] && <VideoTrimmer lang={lang} url={publicUrl('hero-media', slides[trim].path)} onClose={() => setTrim(null)}
        onSaved={(path, replaceIt) => { const n = [...slides]; const item: Slide = { type: 'video', path }; if (replaceIt) n[trim] = item; else n.splice(trim + 1, 0, item); onChange(n); setTrim(null) }} />}
      {newImage && <ImageEditor lang={lang} source={newImage} defaultRatio="16:9" onClose={() => setNewImage(null)} onSave={async blob => { const path = await uploadBlob('hero-media', blob, 'hero', MAX_HERO); onChange([...slides, { type: 'image', path }]); setNewImage(null) }} />}
      {crop !== null && slides[crop] && <ImageEditor lang={lang} source={publicUrl('hero-media', slides[crop].path)} defaultRatio="16:9" onClose={() => setCrop(null)}
        onSave={async blob => { const path = await uploadBlob('hero-media', blob, 'hero', MAX_HERO); const n = [...slides]; n[crop] = { type: 'image', path }; onChange(n); setCrop(null) }} />}
    </div>
  )
}
