import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { adminSupabase } from '../../lib/supabase'

type Design = { surface: 'silver' | 'dark' | 'glass'; transparency: number; blur: number }
const DEFAULT: Design = { surface: 'silver', transparency: 82, blur: 16 }
const labels = {
  hy: { title: 'Գույներ և թափանցիկության էֆեկտներ', silver: 'Սև գրություն / սպիտակ-արծաթագույն ֆոն', dark: 'Սպիտակ գրություն / մուգ ֆոն', glass: 'Թափանցիկ սպիտակ ապակի / սև գրություն', transparency: 'Թափանցիկություն', blur: 'Ապակե էֆեկտի մեղմություն', preview: 'Փորձնական պատուհան', save: 'Պահպանել դիզայնը', saved: 'Դիզայնը պահպանվեց', error: 'Չհաջողվեց պահպանել' },
  ru: { title: 'Цвета и прозрачные эффекты', silver: 'Чёрный текст / бело-серебряный фон', dark: 'Белый текст / тёмный фон', glass: 'Прозрачное белое стекло / чёрный текст', transparency: 'Прозрачность', blur: 'Интенсивность стеклянного эффекта', preview: 'Предпросмотр', save: 'Сохранить дизайн', saved: 'Дизайн сохранён', error: 'Не удалось сохранить' },
  en: { title: 'Colors and transparency effects', silver: 'Black text / white-silver surface', dark: 'White text / dark surface', glass: 'Transparent white glass / black text', transparency: 'Transparency', blur: 'Glass effect strength', preview: 'Preview', save: 'Save design', saved: 'Design saved', error: 'Could not save' },
}
export default function DesignStyleEditor() {
  const lang = (document.documentElement.lang || 'hy').slice(0, 2) as keyof typeof labels
  const t = labels[lang] ?? labels.hy
  const [value, setValue] = useState<Design>(DEFAULT)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => { void adminSupabase.from('site_settings').select('value').eq('key', 'site_design').maybeSingle().then(({ data }) => setValue({ ...DEFAULT, ...(data?.value ?? {}) })) }, [])
  const save = async () => {
    setBusy(true); setMessage('')
    const { error } = await adminSupabase.from('site_settings').upsert({ key: 'site_design', value, updated_at: new Date().toISOString() })
    setBusy(false); setMessage(error ? `${t.error}: ${error.message}` : t.saved)
  }
  const previewStyle: CSSProperties = value.surface === 'dark'
    ? { background: `rgba(12,15,20,${value.transparency / 100})`, color: '#fff', borderColor: '#737b86' }
    : { background: `rgba(255,255,255,${value.transparency / 100})`, color: '#111318', borderColor: '#b9c0c9' }
  return <section className="glass box design-style-editor">
    <h3>{t.title}</h3>
    <div className="design-presets">
      {(['silver', 'dark', 'glass'] as const).map(surface => <button type="button" key={surface} className={value.surface === surface ? 'active' : ''} onClick={() => setValue(v => ({ ...v, surface }))}>{t[surface]}</button>)}
    </div>
    <div className="design-editor-grid">
      <div className="media-controls">
        <label>{t.transparency}: {value.transparency}%<input type="range" min="45" max="100" value={value.transparency} onChange={e => setValue(v => ({ ...v, transparency: Number(e.target.value) }))} /></label>
        <label>{t.blur}: {value.blur}px<input type="range" min="0" max="28" value={value.blur} onChange={e => setValue(v => ({ ...v, blur: Number(e.target.value) }))} /></label>
        <button className="btn-dark" type="button" disabled={busy} onClick={save}>{busy ? '…' : t.save}</button>
        {message && <small role="status">{message}</small>}
      </div>
      <div>
        <small>{t.preview}</small>
        <div className="design-live-preview" style={previewStyle}>
          <strong>ANVA LUXURY</strong><span>SILVER COLLECTION</span><small>Գրությունները պետք է մնան հստակ և ընթեռնելի։</small>
        </div>
      </div>
    </div>
  </section>
}
