import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { DEFAULT_MEDIA_LAYOUT, MediaLayout, mediaLayoutKey, readMediaLayouts, writeMediaLayout } from '../../lib/mediaLayout'

type Props = { bucket: string; path: string; src: string; kind: 'image' | 'video'; label?: string; aspect?: string }
const words = {
  hy: { title: 'Մեդիայի հարմարեցում', fit: 'Լրացման ձև', cover: 'Լրացնել տարածքը', contain: 'Ամբողջությամբ ցույց տալ', x: 'Հորիզոնական դիրք', y: 'Ուղղահայաց դիրք', zoom: 'Մեծացում', preview: 'Փորձնական պատուհան', save: 'Պահպանել կարգավորումները', reset: 'Վերականգնել', saved: 'Կարգավորումները պահպանվեցին', error: 'Չհաջողվեց պահպանել կարգավորումները' },
  ru: { title: 'Настройка медиа', fit: 'Режим заполнения', cover: 'Заполнить область', contain: 'Показать полностью', x: 'Горизонтальное положение', y: 'Вертикальное положение', zoom: 'Масштаб', preview: 'Предпросмотр', save: 'Сохранить настройки', reset: 'Сбросить', saved: 'Настройки сохранены', error: 'Не удалось сохранить настройки' },
  en: { title: 'Media adjustment', fit: 'Fit mode', cover: 'Fill area', contain: 'Show full image', x: 'Horizontal position', y: 'Vertical position', zoom: 'Scale', preview: 'Preview', save: 'Save settings', reset: 'Reset', saved: 'Settings saved', error: 'Could not save settings' },
}
export default function MediaAdjuster({ bucket, path, src, kind, label, aspect = '16 / 9' }: Props) {
  const lang = (document.documentElement.lang || 'hy').slice(0, 2) as keyof typeof words
  const t = words[lang] ?? words.hy
  const [value, setValue] = useState<MediaLayout>(DEFAULT_MEDIA_LAYOUT)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [target, setTarget] = useState(aspect)
  const [customW, setCustomW] = useState(16)
  const [customH, setCustomH] = useState(9)
  const presets = [{ label: 'Գլխավոր սլայդ · 16:9', value: '16 / 9' }, { label: 'Քառակուսի · 1:1', value: '1 / 1' }, { label: 'Ուղղահայաց · 4:5', value: '4 / 5' }, { label: 'Պատմություն · 9:16', value: '9 / 16' }, { label: 'Լայն բաններ · 21:9', value: '21 / 9' }]
  const key = useMemo(() => mediaLayoutKey(bucket, path), [bucket, path])
  useEffect(() => {
    let active = true
    void readMediaLayouts().then(all => { if (active) { const saved = all[key] ?? DEFAULT_MEDIA_LAYOUT; setValue(saved); if (saved.aspect) setTarget(saved.aspect) } }).catch(() => undefined)
    return () => { active = false }
  }, [key])
  const save = async () => {
    setBusy(true); setMessage('')
    try { await writeMediaLayout(bucket, path, { ...value, aspect: target }); setMessage(t.saved) }
    catch { setMessage(t.error) }
    finally { setBusy(false) }
  }
  const reset = () => setValue(DEFAULT_MEDIA_LAYOUT)
  const mediaStyle: CSSProperties = { width: '100%', height: '100%', objectFit: value.fit, objectPosition: `${value.x}% ${value.y}%`, transform: `scale(${value.scale / 100})` }
  return <details className="media-adjuster">
    <summary>{t.title}{label ? ` · ${label}` : ''}</summary>
    <div className="media-adjuster-grid">
      <div className="media-preview-wrap">
        <small>{t.preview}</small>
        <label className="media-target-ratio">Կայքի նախատեսված չափը<select value={target} onChange={e => setTarget(e.target.value)}>{presets.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}<option value={`${customW} / ${customH}`}>Հատուկ չափ՝ {customW}:{customH}</option></select></label>
        <div className="media-custom-size"><label>Լայնություն<input type="number" min="1" max="100" value={customW} onChange={e => { const n = Math.max(1, Number(e.target.value) || 1); setCustomW(n); setTarget(`${n} / ${customH}`) }} /></label><label>Բարձրություն<input type="number" min="1" max="100" value={customH} onChange={e => { const n = Math.max(1, Number(e.target.value) || 1); setCustomH(n); setTarget(`${customW} / ${n}`) }} /></label></div>
        <div className="media-preview" style={{ aspectRatio: target }}>
          {kind === 'video' ? <video src={src} muted playsInline controls style={mediaStyle} /> : <img src={src} alt="Preview" style={mediaStyle} />}
        </div>
      </div>
      <div className="media-controls">
        <label>{t.fit}<select value={value.fit} onChange={e => setValue(v => ({ ...v, fit: e.target.value as MediaLayout['fit'] }))}><option value="cover">{t.cover}</option><option value="contain">{t.contain}</option></select></label>
        <label>{t.x}: {value.x}%<input type="range" min="0" max="100" value={value.x} onChange={e => setValue(v => ({ ...v, x: Number(e.target.value) }))} /></label>
        <label>{t.y}: {value.y}%<input type="range" min="0" max="100" value={value.y} onChange={e => setValue(v => ({ ...v, y: Number(e.target.value) }))} /></label>
        <label>{t.zoom}: {value.scale}%<input type="range" min="70" max="180" value={value.scale} onChange={e => setValue(v => ({ ...v, scale: Number(e.target.value) }))} /></label>
        <div className="media-actions"><button type="button" className="btn-dark" disabled={busy} onClick={save}>{busy ? '…' : t.save}</button><button type="button" className="btn-light" onClick={reset}>{t.reset}</button></div>
        {message && <small role="status">{message}</small>}
      </div>
    </div>
  </details>
}
