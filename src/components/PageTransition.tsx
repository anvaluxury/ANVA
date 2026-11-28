import { ReactNode, useEffect, useRef, useState } from 'react'
import { Location, Routes, useLocation } from 'react-router-dom'
import { lastPointer, prefersReduced } from '../lib/motion'

/** Cinematic page change — "Circle reveal" from the transition reference: a deep-black disc with a thin purple glow edge
 *  grows from the tapped point, the page swaps underneath, then the disc melts away while the new page rises in.
 *  Opening / closing a product dialog (/p/:id) and switching admin tabs are NOT page changes and stay instant. */
const pageKey = (p: string) => p.replace(/^\/[a-z]{2}(?=\/|$)/, '').replace(/\/p\/[^/]+\/?$/, '').replace(/\/+$/, '') || '/'
const needs = (a: Location, b: Location) => {
  if (prefersReduced()) return false
  if (/\/admin(\/|$)/.test(a.pathname) || /\/admin(\/|$)/.test(b.pathname)) return false
  return pageKey(a.pathname) !== pageKey(b.pathname)
}
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export default function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [shown, setShown] = useState(location); const [phase, setPhase] = useState<'idle' | 'in'>('idle')
  const latest = useRef(location); const cur = useRef(location); const busy = useRef(false); const disc = useRef<HTMLDivElement>(null)

  useEffect(() => {
    latest.current = location
    if (busy.current) return
    if (!needs(cur.current, location)) { cur.current = location; setShown(location); return }
    busy.current = true
    void (async () => {
      const el = disc.current
      const fresh = Date.now() - lastPointer.t < 1500 && lastPointer.x >= 0
      const x = fresh ? lastPointer.x : innerWidth / 2; const y = fresh ? lastPointer.y : innerHeight * 0.62
      if (el && el.animate) {
        const d = 2 * Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 40
        el.style.cssText = `left:${x}px;top:${y}px;width:${d}px;height:${d}px;margin:${-d / 2}px 0 0 ${-d / 2}px;visibility:visible;opacity:1`
        await el.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 560, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' }).finished.catch(() => {})
      } else await wait(200)
      cur.current = latest.current; setShown(latest.current)
      if (!latest.current.hash) window.scrollTo(0, 0)
      setPhase('in'); await wait(60)
      if (el && el.animate) {
        await el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 620, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished.catch(() => {})
        el.style.visibility = 'hidden'; el.getAnimations().forEach(a => a.cancel())
      }
      setPhase('idle'); busy.current = false
      if (needs(cur.current, latest.current)) { setShown(latest.current); cur.current = latest.current } else if (latest.current !== cur.current) { cur.current = latest.current; setShown(latest.current) }
    })()
  }, [location]) // eslint-disable-line

  return <>
    <div className={`pt-page${phase === 'in' ? ' pt-in' : ''}`}><Routes location={shown}>{children}</Routes></div>
    <div ref={disc} className="pt-disc" aria-hidden />
  </>
}
