import { ReactNode, useLayoutEffect, useEffect, useRef, useState, PointerEvent as RPE } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lang } from '../i18n'
import { supabase } from '../lib/supabase'

export type DockItem = { hash: string; label: string; icon: ReactNode }

/** Mobile floating glass navigation ("Liquid glass" menu reference).
 *  Tap an item, or put a finger on the bar and slide: the glass pill follows the finger, stretches with speed,
 *  and on release snaps to the nearest section and scrolls there smoothly. On the homepage the pill also follows scrolling. */
export default function MobileDock({ lang, home, items }: { lang: Lang; home: boolean; items: DockItem[] }) {
  const nav = useNavigate()
  const track = useRef<HTMLDivElement>(null); const pill = useRef<HTMLSpanElement>(null); const btns = useRef<(HTMLButtonElement | null)[]>([])
  const [active, setActive] = useState(home ? 0 : -1); const [hot, setHot] = useState(-1)
  const [transparency, setTransparency] = useState(85)

  // Load the transparency selected from the admin panel.
  useEffect(() => {
    let alive = true
    void supabase.from('site_settings').select('value').eq('key', 'mobile_dock').maybeSingle()
      .then(
        ({ data }) => {
          if (!alive) return
          const raw = Number((data?.value as { transparency?: number } | null)?.transparency)
          if (Number.isFinite(raw)) setTransparency(Math.min(95, Math.max(0, raw)))
        },
        () => { /* keep default transparency when the setting is unavailable */ }
      )
    return () => { alive = false }
  }, [])
  const drag = useRef({ on: false, id: -1, sx: 0, lx: 0, lt: 0, vx: 0, hot: -1 }); const lock = useRef(0)
  const keyStr = items.map(i => i.hash).join()

  const place = (i: number) => {
    const p = pill.current; const b = btns.current[i]
    if (!p) return
    if (!b) { p.style.opacity = '0'; return }
    p.style.opacity = '1'; p.style.width = `${b.offsetWidth}px`; p.style.translate = `${b.offsetLeft}px 0`
  }
  useLayoutEffect(() => { if (!drag.current.on) place(active) }, [active, keyStr])
  useEffect(() => { const f = () => place(active); addEventListener('resize', f); return () => removeEventListener('resize', f) }, [active])

  // pill follows scrolling on the homepage
  useEffect(() => {
    if (!home) { setActive(-1); return }
    let raf = 0
    const calc = () => {
      raf = 0; if (Date.now() < lock.current || drag.current.on) return
      const y = innerHeight * 0.4; let idx = 0
      items.forEach((it, i) => { if (it.hash === 'top') return; const el = document.getElementById(it.hash); if (el && el.getBoundingClientRect().top <= y) idx = i })
      if (scrollY < 80) idx = 0
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 6) idx = items.length - 1
      setActive(p => (p === idx ? p : idx))
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(calc) }
    addEventListener('scroll', on, { passive: true }); calc()
    return () => { removeEventListener('scroll', on); cancelAnimationFrame(raf) }
  }, [home, keyStr]) // eslint-disable-line

  const go = (i: number) => {
    const hash = items[i]?.hash; if (!hash) return
    if (home) {
      lock.current = Date.now() + 1000
      const el = document.getElementById(hash)
      if (hash === 'top' || !el) window.scrollTo({ top: 0, behavior: 'smooth' }); else el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else nav({ pathname: `/${lang}`, hash: `#${hash}` })
  }
  const select = (i: number) => { setActive(i); place(i); go(i) }

  const idxAt = (cx: number) => {
    const r = track.current!.getBoundingClientRect(); const x = cx - r.left; let best = 0; let d = 1e9
    btns.current.forEach((b, i) => { if (!b) return; const dd = Math.abs(b.offsetLeft + b.offsetWidth / 2 - x); if (dd < d) { d = dd; best = i } })
    return best
  }
  const follow = (cx: number) => {
    const p = pill.current; const t = track.current; const b = btns.current[0]; if (!p || !t || !b) return
    const r = t.getBoundingClientRect(); const w = b.offsetWidth; const s = Math.min(Math.abs(drag.current.vx) * 34, 30)
    const x = Math.max(0, Math.min(r.width - w, cx - r.left - w / 2))
    p.style.opacity = '1'; p.style.width = `${w + s}px`; p.style.translate = `${Math.max(0, x - s / 2)}px 0`
  }
  const down = (e: RPE) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    drag.current = { on: true, id: e.pointerId, sx: e.clientX, lx: e.clientX, lt: performance.now(), vx: 0, hot: idxAt(e.clientX) }
    try { track.current!.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    track.current!.classList.add('drag'); setHot(drag.current.hot); follow(e.clientX)
  }
  const move = (e: RPE) => {
    const d = drag.current; if (!d.on || e.pointerId !== d.id) return
    const now = performance.now(); const dt = Math.max(now - d.lt, 1)
    d.vx = d.vx * 0.6 + ((e.clientX - d.lx) / dt) * 0.4; d.lx = e.clientX; d.lt = now
    follow(e.clientX)
    const i = idxAt(e.clientX); if (i !== d.hot) { d.hot = i; setHot(i); try { navigator.vibrate?.(6) } catch { /* ignore */ } }
  }
  const up = (e: RPE) => {
    const d = drag.current; if (!d.on || e.pointerId !== d.id) return
    d.on = false; track.current?.classList.remove('drag'); setHot(-1)
    try { track.current!.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    select(idxAt(e.clientX))
  }
  const cancel = () => { drag.current.on = false; track.current?.classList.remove('drag'); setHot(-1); place(active) }

  return (
    <nav className="dock" aria-label="Menu">
      <div ref={track} className="dock-track" style={{ "--dock-glass-alpha": String((100 - transparency) / 100) } as CSSProperties} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
        <span ref={pill} className="dock-pill" aria-hidden />
        {items.map((it, i) => (
          <button key={it.hash} ref={el => { btns.current[i] = el }} type="button" className={`dock-item${i === active ? ' on' : ''}${i === hot ? ' hot' : ''}`}
            aria-current={i === active ? 'page' : undefined} onClick={e => { if (e.detail === 0) select(i) }}>
            {it.icon}<span>{it.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
