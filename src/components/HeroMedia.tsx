import { useEffect, useRef, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { publicUrl } from '../lib/auth'
import { Slide, useSiteConfig } from '../lib/siteConfig'
import { useMediaLayouts, mediaStyle } from '../lib/mediaLayout'

export type { Slide }
export type HeroCfg = { slides: Slide[]; autoplay: boolean; interval: number; overlay: number }
type Legacy = Partial<HeroCfg>

/** Hero background. Order of precedence: published visual-editor media (desktop / mobile) → legacy site_settings.hero_media → quiet silver placeholder. */
export default function HeroMedia({ onHas }: { onHas?: (has: boolean) => void }) {
  const { cfg, mobile } = useSiteConfig(); const media = useMediaLayouts()
  const [legacy, setLegacy] = useState<Legacy | null>(null)
  const [i, setI] = useState(0)
  const vids = useRef<(HTMLVideoElement | null)[]>([])
  const reduce = useRef(typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    if (!supabaseConfigured) return
    void supabase.from('site_settings').select('value').eq('key', 'hero_media').maybeSingle().then(({ data }) => setLegacy((data?.value as Legacy | undefined) ?? null))
  }, [])

  const own = mobile && cfg.media.heroM.length ? cfg.media.heroM : cfg.media.heroD
  const slides: Slide[] = own.length ? own : (legacy?.slides ?? [])
  const interval = own.length ? 6 : Math.max(3, legacy?.interval || 6)
  const autoplay = own.length ? true : legacy?.autoplay !== false
  const n = slides.length
  // legacy overlay (set in Homepage → media) applies until the visual editor sets its own darkening
  const editorOv = cfg.values['hero.overlay|d'] !== undefined || cfg.values['hero.overlay|m'] !== undefined
  const legacyOv = !own.length && !editorOv && typeof legacy?.overlay === 'number' ? legacy.overlay / 100 : undefined
  const idx = n ? Math.min(i, n - 1) : 0
  const cur = slides[idx]
  const go = (d: number) => setI(x => (x + d + n) % n)
  useEffect(() => { setI(0) }, [mobile, own.length])
  useEffect(() => { onHas?.(n > 0) }, [n]) // eslint-disable-line

  useEffect(() => { vids.current.forEach((v, k) => { if (!v) return; if (k === idx && !reduce.current) void v.play().catch(() => {}); else v.pause() }) }, [idx, slides.map(s => s.path).join('|')]) // eslint-disable-line
  useEffect(() => {
    if (n < 2 || !autoplay || reduce.current || cur?.type === 'video') return
    const t = setTimeout(() => go(1), interval * 1000); return () => clearTimeout(t)
  }, [n, idx, autoplay, interval, cur?.type]) // eslint-disable-line

  const activeLayout = cur ? media.get('hero-media', cur.path) : undefined
  return (
    <div className="hero-media" style={activeLayout?.aspect ? { aspectRatio: activeLayout.aspect, height: 'auto', maxHeight: '100%' } : undefined}>
      {!n && <div className="hero-fallback" aria-hidden />}
      {slides.map((s, k) => {
        const src = publicUrl('hero-media', s.path)
        return s.type === 'video'
          ? <video key={s.path} ref={el => { vids.current[k] = el }} className={`hm-slide${k === idx ? ' on' : ''}`} style={{ ...mediaStyle(media.get('hero-media', s.path)), transform: 'scale(calc(var(--hero-zoom) * var(--media-scale,1)))' }} src={`${src}#t=0.1`} muted playsInline preload={k === idx ? 'auto' : 'metadata'} loop={n === 1} onEnded={() => n > 1 && go(1)} aria-hidden />
          : <img key={s.path} className={`hm-slide${k === idx ? ' on' : ''}`} style={{ ...mediaStyle(media.get('hero-media', s.path)), transform: 'scale(calc(var(--hero-zoom) * var(--media-scale,1)))' }} src={src} alt="" loading={k === 0 ? 'eager' : 'lazy'} />
      })}
      <div className="hm-shade" aria-hidden style={legacyOv !== undefined ? { background: `rgb(12 14 18 / ${legacyOv})` } : undefined} />
      {n > 1 && <>
        <button className="hm-arrow l" aria-label="Previous" onClick={() => go(-1)}>‹</button>
        <button className="hm-arrow r" aria-label="Next" onClick={() => go(1)}>›</button>
        <div className="hm-dots">{slides.map((_, k) => <button key={k} aria-label={`Slide ${k + 1}`} aria-current={k === idx} className={k === idx ? 'on' : ''} onClick={() => setI(k)} />)}</div>
      </>}
    </div>
  )
}
