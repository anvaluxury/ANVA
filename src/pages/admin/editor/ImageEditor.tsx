import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Lang } from '../../../i18n'
import { E } from '../../../i18n/editor'
import { fmtBytes } from '../../../lib/media'

type Props = { lang: Lang; source: File | string; onSave: (blob: Blob) => Promise<void> | void; onClose: () => void; defaultRatio?: string }
const RATIOS: [string, number | null][] = [['orig', null], ['1:1', 1], ['4:5', 4 / 5], ['3:4', 3 / 4], ['4:3', 4 / 3], ['16:9', 16 / 9], ['21:9', 21 / 9], ['9:16', 9 / 16], ['custom', -1]]
const SIZES = [800, 1200, 1600, 2000, 2400]
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** Non-destructive crop / resize / rotate. Always produces a NEW image file; the original is never modified. */
export default function ImageEditor({ lang, source, onSave, onClose, defaultRatio = 'orig' }: Props) {
  const e = (k: Parameters<typeof E>[1]) => E(lang, k)
  const [base, setBase] = useState<HTMLCanvasElement | null>(null)       // image with rotation applied
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const [ratioKey, setRatioKey] = useState(defaultRatio); const [cw, setCw] = useState(4); const [ch, setCh] = useState(5)
  const [zoom, setZoom] = useState(1); const [c, setC] = useState({ x: .5, y: .5 })   // image point (0..1) shown at the frame centre
  const [rot, setRot] = useState(0); const [maxEdge, setMaxEdge] = useState(1600)
  const [result, setResult] = useState<{ w: number; h: number; bytes: number } | null>(null)
  const wrap = useRef<HTMLDivElement>(null); const cv = useRef<HTMLCanvasElement>(null); const img = useRef<HTMLImageElement | null>(null)
  const [box, setBox] = useState({ w: 520, h: 420 })

  // load
  useEffect(() => {
    let url = ''; const im = new Image(); im.crossOrigin = 'anonymous'
    im.onload = () => { img.current = im; setRot(0) ; draw0(im, 0) }
    im.onerror = () => setErr(e('ie_load_err'))
    if (typeof source === 'string') im.src = source; else { url = URL.createObjectURL(source); im.src = url }
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [source]) // eslint-disable-line
  const draw0 = (im: HTMLImageElement, deg: number) => {
    const sw = deg % 180 ? im.naturalHeight : im.naturalWidth, sh = deg % 180 ? im.naturalWidth : im.naturalHeight
    const k = Math.min(1, 4000 / Math.max(sw, sh))   // keep working canvas reasonable
    const b = document.createElement('canvas'); b.width = Math.round(sw * k); b.height = Math.round(sh * k)
    const g = b.getContext('2d'); if (!g) return setErr(e('ie_load_err'))
    g.translate(b.width / 2, b.height / 2); g.rotate((deg * Math.PI) / 180); g.scale(k, k); g.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight / 2)
    setBase(b); setC({ x: .5, y: .5 })
  }
  const rotate = () => { const d = (rot + 90) % 360; setRot(d); if (img.current) draw0(img.current, d) }

  useEffect(() => { const el = wrap.current; if (!el) return; const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: Math.min(window.innerHeight * .55, 520) })); ro.observe(el); return () => ro.disconnect() }, [])

  const ratio = useMemo(() => {
    if (!base) return 1
    if (ratioKey === 'orig') return base.width / base.height
    if (ratioKey === 'custom') return clamp(cw / Math.max(ch, .01), .2, 5)
    return RATIOS.find(r => r[0] === ratioKey)?.[1] ?? 1
  }, [ratioKey, cw, ch, base])
  const frame = useMemo(() => { let w = box.w, h = w / ratio; if (h > box.h) { h = box.h; w = h * ratio } return { w: Math.max(40, Math.floor(w)), h: Math.max(40, Math.floor(h)) } }, [box, ratio])
  const geo = useMemo(() => { if (!base) return null; const s = Math.max(frame.w / base.width, frame.h / base.height) * zoom; return { s, sw: frame.w / s, sh: frame.h / s } }, [base, frame, zoom])
  const limited = useCallback((p: { x: number; y: number }) => { if (!base || !geo) return p
    const mx = geo.sw / base.width / 2, my = geo.sh / base.height / 2; return { x: clamp(p.x, mx, 1 - mx), y: clamp(p.y, my, 1 - my) } }, [base, geo])
  useEffect(() => { setC(p => limited(p)) }, [zoom, frame, limited])

  // draw preview
  useEffect(() => {
    const k = cv.current, g = k?.getContext('2d'); if (!k || !g || !base || !geo) return
    const dpr = Math.min(devicePixelRatio || 1, 2); k.width = frame.w * dpr; k.height = frame.h * dpr; k.style.width = frame.w + 'px'; k.style.height = frame.h + 'px'
    g.imageSmoothingQuality = 'high'; g.drawImage(base, c.x * base.width - geo.sw / 2, c.y * base.height - geo.sh / 2, geo.sw, geo.sh, 0, 0, k.width, k.height)
  }, [base, geo, c, frame])

  // output size estimate
  const render = useCallback(async (type = 'image/webp', q = .9): Promise<Blob | null> => {
    if (!base || !geo) return null
    const sw = geo.sw, sh = geo.sh, k = Math.min(1, maxEdge / Math.max(sw, sh)); const o = document.createElement('canvas'); o.width = Math.max(1, Math.round(sw * k)); o.height = Math.max(1, Math.round(sh * k))
    const g = o.getContext('2d'); if (!g) return null; g.imageSmoothingQuality = 'high'
    g.drawImage(base, c.x * base.width - sw / 2, c.y * base.height - sh / 2, sw, sh, 0, 0, o.width, o.height)
    return new Promise(res => o.toBlob(b => res(b), type, q))
  }, [base, geo, c, maxEdge])
  useEffect(() => { const t = setTimeout(async () => { const b = await render(); if (b && geo) { const k = Math.min(1, maxEdge / Math.max(geo.sw, geo.sh)); setResult({ w: Math.round(geo.sw * k), h: Math.round(geo.sh * k), bytes: b.size }) } }, 250); return () => clearTimeout(t) }, [render, geo, maxEdge])

  // drag to reposition
  const drag = useRef<{ x: number; y: number; c: { x: number; y: number } } | null>(null)
  const down = (ev: React.PointerEvent) => { (ev.target as Element).setPointerCapture(ev.pointerId); drag.current = { x: ev.clientX, y: ev.clientY, c } }
  const move = (ev: React.PointerEvent) => { const d = drag.current; if (!d || !base || !geo) return
    setC(limited({ x: d.c.x - (ev.clientX - d.x) / (base.width * geo.s), y: d.c.y - (ev.clientY - d.y) / (base.height * geo.s) })) }
  const up = () => { drag.current = null }

  const save = async () => {
    setBusy(true); setErr('')
    try { let b = await render('image/webp', .9); if (!b || b.type !== 'image/webp') b = await render('image/jpeg', .9); if (!b) throw new Error(e('ie_load_err')); await onSave(b) }
    catch (x) { setErr(x instanceof Error ? (x.message === 'size' ? e('bad_file') : x.message) : String(x)); setBusy(false) }
  }

  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={e('ie_title')}>
      <div className="modal ie">
        <header><h3>{e('ie_title')}</h3><button className="x" onClick={onClose} aria-label={e('close')}>✕</button></header>
        <div className="ie-body">
          <div className="ie-stage" ref={wrap}>
            {!base && !err && <p className="muted">{e('loading')}</p>}
            {base && <canvas ref={cv} className="ie-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />}
            {base && <small className="muted">{e('ie_drag')}</small>}
          </div>
          <div className="ie-tools">
            <label>{e('ie_ratio')}<select value={ratioKey} onChange={ev => setRatioKey(ev.target.value)}>{RATIOS.map(([k]) => <option key={k} value={k}>{k === 'orig' ? e('ie_original') : k === 'custom' ? e('ie_custom') : k}</option>)}</select></label>
            {ratioKey === 'custom' && <div className="two"><label>W<input type="number" min={1} max={50} value={cw} onChange={ev => setCw(Number(ev.target.value) || 1)} /></label><label>H<input type="number" min={1} max={50} value={ch} onChange={ev => setCh(Number(ev.target.value) || 1)} /></label></div>}
            <label>{e('ie_zoom')}: {Math.round(zoom * 100)}%<input type="range" min={1} max={4} step={.01} value={zoom} onChange={ev => setZoom(Number(ev.target.value))} /></label>
            <label>{e('ie_size')}<select value={maxEdge} onChange={ev => setMaxEdge(Number(ev.target.value))}>{SIZES.map(s => <option key={s} value={s}>{s} px</option>)}</select></label>
            <button type="button" className="btn-light sm" onClick={rotate} disabled={!base}>{e('ie_rotate')}</button>
            {result && <p className="ie-res"><b>{e('ie_result')}:</b> {result.w}×{result.h} px · ~{fmtBytes(result.bytes)}</p>}
            <p className="muted">{e('ie_note')}</p>
            {err && <p className="msg error" role="alert">{err}</p>}
          </div>
        </div>
        <footer><button className="btn-light" onClick={onClose} disabled={busy}>{e('cancel')}</button><button className="btn-dark" onClick={save} disabled={!base || busy}>{busy ? e('saving') : e('ie_save')}</button></footer>
      </div>
    </div>
  )
}
