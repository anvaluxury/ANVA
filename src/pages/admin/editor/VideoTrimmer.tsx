import { useEffect, useRef, useState } from 'react'
import type { Lang } from '../../../../supabase/functions/auto-translate'
import { E } from '../../../i18n/editor'
import { MAX_HERO, fmtTime, uploadBlob } from '../../../lib/media'

type Props = { lang: Lang; url: string; onClose: () => void; onSaved: (path: string, replaceOriginal: boolean) => void }
type Phase = 'idle' | 'engine' | 'encode' | 'upload'

/** Trims an MP4 into a NEW MP4 file with ffmpeg.wasm (runs in the browser; the core is served from /ffmpeg, see scripts/copy-ffmpeg-core.mjs). */
export default function VideoTrimmer({ lang, url, onClose, onSaved }: Props) {
  const e = (k: Parameters<typeof E>[1]) => E(lang, k)
  const vid = useRef<HTMLVideoElement>(null); const stop = useRef<(() => void) | null>(null)
  const [dur, setDur] = useState(0); const [a, setA] = useState(0); const [b, setB] = useState(0); const [t, setT] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle'); const [pct, setPct] = useState(0); const [err, setErr] = useState(''); const [replace, setReplace] = useState(false); const [previewing, setPreviewing] = useState(false)
  const busy = phase !== 'idle'

  useEffect(() => () => stop.current?.(), [])
  const seek = (s: number) => { if (vid.current) vid.current.currentTime = s }
  const setStart = (v: number) => { const x = Math.min(Math.max(0, v), Math.max(0, b - .5)); setA(x); seek(x) }
  const setEnd = (v: number) => { const x = Math.max(Math.min(dur, v), a + .5); setB(x); seek(Math.max(a, x - .3)) }

  // preview of the trimmed part: play from start, pause at end
  const togglePreview = () => {
    const v = vid.current; if (!v) return
    if (previewing) { v.pause(); setPreviewing(false); return }
    v.currentTime = a; void v.play(); setPreviewing(true)
  }
  const onTime = () => { const v = vid.current; if (!v) return; setT(v.currentTime); if (previewing && v.currentTime >= b) { v.pause(); setPreviewing(false); v.currentTime = a } }

  const run = async () => {
    setErr(''); if (b - a < .5) return setErr(e('vt_range_err'))
    vid.current?.pause(); setPreviewing(false)
    let ff: { terminate(): void } | null = null
    try {
      setPhase('engine'); setPct(0)
      let FFmpegMod: typeof import('@ffmpeg/ffmpeg'), UtilMod: typeof import('@ffmpeg/util')
      try { FFmpegMod = await import('@ffmpeg/ffmpeg'); UtilMod = await import('@ffmpeg/util') } catch { throw new Error(e('vt_engine_err')) }
      const ffmpeg = new FFmpegMod.FFmpeg(); ff = ffmpeg; stop.current = () => ffmpeg.terminate()
      ffmpeg.on('progress', ev => { setPhase('encode'); setPct(Math.min(99, Math.round(ev.progress * 100))) })
      try {
        await ffmpeg.load({ coreURL: await UtilMod.toBlobURL(`${location.origin}/ffmpeg/ffmpeg-core.js`, 'text/javascript'), wasmURL: await UtilMod.toBlobURL(`${location.origin}/ffmpeg/ffmpeg-core.wasm`, 'application/wasm') })
      } catch { throw new Error(e('vt_engine_err')) }
      await ffmpeg.writeFile('in.mp4', await UtilMod.fetchFile(url))
      setPhase('encode')
      const code = await ffmpeg.exec(['-ss', a.toFixed(3), '-i', 'in.mp4', '-t', (b - a).toFixed(3), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', 'out.mp4'])
      if (code !== 0) throw new Error(`${e('vt_err')} (ffmpeg ${code})`)
      const data = await ffmpeg.readFile('out.mp4'); if (typeof data === 'string') throw new Error(e('vt_err'))
      const blob = new Blob([data as unknown as BlobPart], { type: 'video/mp4' })
      if (blob.size > MAX_HERO) throw new Error(e('vt_too_big'))
      setPhase('upload'); setPct(100)
      const path = await uploadBlob('hero-media', blob, 'trimmed', MAX_HERO)
      onSaved(path, replace)
    } catch (x) { setErr(x instanceof Error ? x.message : String(x)); setPhase('idle') }
    finally { ff?.terminate(); stop.current = null }
  }

  const label = phase === 'engine' ? e('vt_loading_engine') : phase === 'encode' ? `${e('vt_encoding')} ${pct}%` : phase === 'upload' ? e('vt_uploading') : ''
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={e('vt_title')}>
      <div className="modal vt">
        <header><h3>{e('vt_title')}</h3><button className="x" onClick={() => { stop.current?.(); onClose() }} aria-label={e('close')}>✕</button></header>
        <div className="vt-body">
          <video ref={vid} src={url} controls playsInline preload="metadata" crossOrigin="anonymous" className="vt-video"
            onLoadedMetadata={ev => { const d = ev.currentTarget.duration; if (Number.isFinite(d)) { setDur(d); setB(d) } }} onError={() => setErr(e('vt_load_err'))} onTimeUpdate={onTime} onPause={() => previewing && setPreviewing(false)} />
          {dur > 0 && <>
            <div className="vt-bar" aria-hidden><i style={{ left: `${(a / dur) * 100}%`, width: `${((b - a) / dur) * 100}%` }} /><b style={{ left: `${(t / dur) * 100}%` }} /></div>
            <div className="vt-grid">
              <div><label>{e('vt_start')}: <b>{fmtTime(a)}</b><input type="range" min={0} max={dur} step={.1} value={a} onChange={ev => setStart(Number(ev.target.value))} disabled={busy} /></label>
                <button type="button" className="btn-light sm" onClick={() => setStart(vid.current?.currentTime ?? 0)} disabled={busy}>{e('vt_here')}</button></div>
              <div><label>{e('vt_end')}: <b>{fmtTime(b)}</b><input type="range" min={0} max={dur} step={.1} value={b} onChange={ev => setEnd(Number(ev.target.value))} disabled={busy} /></label>
                <button type="button" className="btn-light sm" onClick={() => setEnd(vid.current?.currentTime ?? dur)} disabled={busy}>{e('vt_here')}</button></div>
            </div>
            <div className="vt-actions"><button type="button" className="btn-light sm" onClick={togglePreview} disabled={busy}>{previewing ? '❚❚' : '▶'} {e('vt_preview')}</button><span className="muted">{e('vt_length')}: <b>{fmtTime(b - a)}</b></span></div>
            <label className="chk"><input type="checkbox" checked={replace} onChange={ev => setReplace(ev.target.checked)} disabled={busy} />{e('vt_replace')}</label>
            <p className="muted">{e('vt_note')}</p>
          </>}
          {busy && <div className="vt-prog" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${phase === 'engine' ? 8 : pct}%` }} /><span>{label}</span></div>}
          {err && <p className="msg error" role="alert">{err}</p>}
        </div>
        <footer><button className="btn-light" onClick={() => { stop.current?.(); onClose() }}>{e('cancel')}</button><button className="btn-dark" onClick={run} disabled={busy || dur <= 0}>{busy ? label || e('saving') : e('vt_save')}</button></footer>
      </div>
    </div>
  )
}
