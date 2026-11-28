import { useEffect, useRef, useState } from 'react'
import { assets } from '../assets'
import { prefersReduced } from '../lib/motion'

/** Branded splash loader — "Shape morph" + "Progress ring" from the loader reference, in the ANVA palette.
 *  Shown once per browser tab session (a short version on later reloads); never on admin routes. */
const R = 78; const C = 2 * Math.PI * R

export default function Splash() {
  const skip = prefersReduced() || /\/admin(\/|$)/.test(location.pathname)
  const [alive, setAlive] = useState(!skip); const [out, setOut] = useState(false); const [pct, setPct] = useState(0)
  const done = useRef(false)

  useEffect(() => {
    const root = document.documentElement
    if (skip) { root.classList.add('mo-ready'); return }
    let first = true; try { first = !sessionStorage.getItem('anva_splash'); sessionStorage.setItem('anva_splash', '1') } catch { /* private mode */ }
    const min = first ? 2100 : 900; const t0 = performance.now(); let raf = 0; let ready = false
    const logo = new Image(); logo.src = assets.branding.logo
    const gate = Promise.all([
      document.readyState === 'complete' ? Promise.resolve() : new Promise<void>(r => addEventListener('load', () => r(), { once: true })),
      document.fonts?.ready ?? Promise.resolve(),
      logo.decode?.().catch(() => {}) ?? Promise.resolve(),
    ]); void gate.then(() => { ready = true })
    const tick = (now: number) => {
      const k = Math.min((now - t0) / min, 1); const eased = 1 - Math.pow(1 - k, 3)
      setPct(ready ? Math.min(eased * 100, 100) : Math.min(eased * 100, 86))
      if (k >= 1 && ready && !done.current) { done.current = true; setPct(100); setOut(true); root.classList.add('mo-ready'); setTimeout(() => setAlive(false), 1050); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const hard = setTimeout(() => { done.current = true; setOut(true); root.classList.add('mo-ready'); setTimeout(() => setAlive(false), 1050) }, 6000)
    return () => { cancelAnimationFrame(raf); clearTimeout(hard) }
  }, []) // eslint-disable-line

  if (!alive) return null
  const full = pct >= 99.5
  return (
    <div className={`splash${out ? ' out' : ''}${full ? ' full' : ''}`} role="status" aria-live="polite" aria-label="Loading" style={{ pointerEvents: out ? 'none' : 'auto' }}>
      <div className="sp-mark">
        <span className="sp-morph" aria-hidden />
        <svg className="sp-ring" viewBox="0 0 180 180" aria-hidden>
          <defs><linearGradient id="spg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset=".55" stopColor="#D9D9D9" /><stop offset="1" stopColor="#6B6B6B" /></linearGradient></defs>
          <circle cx="90" cy="90" r={R} className="sp-track" />
          <circle cx="90" cy="90" r={R} className="sp-bar" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} />
        </svg>
        <div className="sp-logo"><img src={assets.branding.logo} alt="" /><i style={{ WebkitMaskImage: `url(${assets.branding.logo})`, maskImage: `url(${assets.branding.logo})` }} aria-hidden /></div>
      </div>
      <span className="sp-spark a" aria-hidden /><span className="sp-spark b" aria-hidden /><span className="sp-spark c" aria-hidden />
    </div>
  )
}
