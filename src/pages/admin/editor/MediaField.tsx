import { useRef, useState } from 'react'
import type { Lang } from '../../../../supabase/functions/auto-translate'
import { E } from '../../../i18n/editor'
import { IMG_TYPES, MAX_IMAGE, uploadBlob } from '../../../lib/media'
import { publicUrl } from '../../../lib/auth'
import ImageEditor from './ImageEditor'

type Props = { lang: Lang; label: string; bucket: string; folder: string; path: string; onChange: (path: string) => void; ratio?: string; note?: string }

/** One image slot: upload → crop/resize → saved as a NEW file; replace; edit existing; remove (the file itself stays in storage). */
export default function MediaField({ lang, label, bucket, folder, path, onChange, ratio, note }: Props) {
  const e = (k: Parameters<typeof E>[1]) => E(lang, k)
  const input = useRef<HTMLInputElement>(null); const [src, setSrc] = useState<File | string | null>(null); const [msg, setMsg] = useState('')
  const pick = (f?: File) => { if (!f) return; if (!IMG_TYPES.includes(f.type) || f.size > 20 * 1024 * 1024) return setMsg(e('bad_file')); setMsg(''); setSrc(f) }
  const url = path ? publicUrl(bucket, path) : ''
  return (
    <div className="mf">
      <span className="mf-label">{label}</span>
      <div className="mf-row">
        <div className="mf-thumb">{url ? <img src={url} alt="" /> : <span>{e('no_image')}</span>}</div>
        <div className="mf-btns">
          <button type="button" className="btn-light sm" onClick={() => input.current?.click()}>{url ? e('replace') : e('upload')}</button>
          {url && <button type="button" className="btn-light sm" onClick={() => setSrc(url)}>{e('edit_img')}</button>}
          {url && <button type="button" className="btn-light sm danger" onClick={() => onChange('')}>{e('remove')}</button>}
        </div>
      </div>
      <input ref={input} type="file" hidden accept={IMG_TYPES.join(',')} onChange={ev => { pick(ev.target.files?.[0]); ev.target.value = '' }} />
      {!url && <small className="muted">{note ?? e('placeholder_note')}</small>}{url && <small className="muted">{e('file_kept')}</small>}<small className="muted mf-dimension-hint">{lang === 'hy' ? 'Նկարի չափերն ու հարաբերակցությունը կարող եք ընտրել խմբագրման պատուհանում՝ «Հատուկ» տարբերակով (W × H), ինչպես նաև սահմանել վերջնական պիքսելային չափը։' : lang === 'ru' ? 'Соотношение сторон задаётся в редакторе через «Свой размер» (Ш × В); там же можно выбрать итоговое разрешение в пикселях.' : 'Choose any image aspect ratio in the editor with “Custom” (W × H), and set the final pixel resolution there.'}</small>
      {msg && <p className="msg error" role="alert">{msg}</p>}
      {src && <ImageEditor lang={lang} source={src} defaultRatio={ratio} onClose={() => setSrc(null)} onSave={async blob => { onChange(await uploadBlob(bucket, blob, folder, MAX_IMAGE)); setSrc(null) }} />}
    </div>
  )
}
