/* ANVA LUXURY — motion engine.
   Pure progressive enhancement: it only adds classes / tiny elements to the existing markup and never touches data,
   routing or Supabase. Everything is skipped under prefers-reduced-motion. */

export const prefersReduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
export const finePointer = () => typeof matchMedia !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches

/** last pointer position — used as the origin of the page "circle reveal" and the product-dialog zoom */
export const lastPointer = { x: -1, y: -1, t: 0 }

const RIPPLE = '.btn-dark,.btn-light,.ic-btn,.order button,.thumbs button,.gal-arrow,.hm-arrow,.mdl-x,.menu a'
const JELLY = '.pcard-heart,.heart,.order button,.thumbs button'
const LIGHT = '.pcard-img,.cat,.feat,.acct-card,.btn-dark,.btn-light'
const REVEAL: [string, number][] = [
  ['.sec-head', 0], ['.cat', 1], ['.feat', 0], ['.about-copy', 0], ['.about-art', 1], ['.banner', 0],
  ['.page-head', 0], ['.tools', 1], ['.pcard', 1], ['.acct-head', 0], ['.acct-card', 1], ['.foot-in > *', 1], ['.auth-panel > *', 1],
]

/** damped oscillation (video "Jelly bounce": squash 0.2 · 3.1 Hz · decay 4.2) */
function jelly(el: HTMLElement) {
  if (!el.animate) return
  const frames: Keyframe[] = []; const N = 14; const dur = 760
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * (dur / 1000); const s = 0.2 * Math.exp(-4.2 * t) * Math.sin(2 * Math.PI * 3.1 * t + Math.PI)
    frames.push({ scale: `${(1 + s).toFixed(3)} ${(1 - s).toFixed(3)}`, offset: i / N })
  }
  el.animate(frames, { duration: dur, easing: 'linear' })
}

function ripple(el: HTMLElement, x: number, y: number) {
  const r = el.getBoundingClientRect(); const d = Math.max(r.width, r.height) * 2.3
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
  el.classList.add('mo-fx')
  const s = document.createElement('span'); s.className = 'mo-ripple'; s.setAttribute('aria-hidden', 'true')
  s.style.cssText = `width:${d}px;height:${d}px;left:${x - r.left - d / 2}px;top:${y - r.top - d / 2}px`
  el.appendChild(s); setTimeout(() => s.remove(), 900)
}

export function initMotion(): () => void {
  const root = document.documentElement; const off: (() => void)[] = []
  const reduced = prefersReduced()
  root.classList.add('mo-js')
  const ready = setTimeout(() => root.classList.add('mo-ready'), 4500) // failsafe: never leave the hero hidden
  off.push(() => clearTimeout(ready))

  const on = <K extends keyof DocumentEventMap>(t: K, f: (e: DocumentEventMap[K]) => void, o?: AddEventListenerOptions) => { document.addEventListener(t, f, o); off.push(() => document.removeEventListener(t, f)) }

  on('pointerdown', e => {
    lastPointer.x = e.clientX; lastPointer.y = e.clientY; lastPointer.t = Date.now()
    if (reduced) return
    const el = (e.target as Element | null)?.closest<HTMLElement>(RIPPLE)
    if (el && !(el as HTMLButtonElement).disabled && !el.closest('.adm-main table')) ripple(el, e.clientX, e.clientY)
  }, { passive: true })
  on('click', e => {
    if (reduced) return
    const el = (e.target as Element | null)?.closest<HTMLElement>(JELLY)
    if (el && !(el as HTMLButtonElement).disabled) jelly(el)
  })

  if (reduced) return () => off.forEach(f => f())

  // ---- cursor-following silver/purple light on cards (desktop only) ----
  if (finePointer()) {
    let raf = 0
    on('pointermove', e => {
      if (raf) return; const t = e.target as Element | null
      raf = requestAnimationFrame(() => {
        raf = 0; const el = t?.closest<HTMLElement>(LIGHT); if (!el) return
        const r = el.getBoundingClientRect(); el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`)
      })
    }, { passive: true })
    // liquid-glass pill that glides between header links ("Liquid glass" menu)
    const pill = (nav: HTMLElement, a: HTMLElement | null) => {
      const p = nav.querySelector<HTMLElement>('.menu-pill'); if (!p) return
      const target = a ?? nav.querySelector<HTMLElement>('a.on')
      if (!target) { p.style.opacity = '0'; return }
      p.style.opacity = '1'; p.style.width = `${target.offsetWidth}px`; p.style.translate = `${target.offsetLeft}px 0`
    }
    on('pointerover', e => { const a = (e.target as Element | null)?.closest<HTMLElement>('.menu a'); const nav = a?.closest<HTMLElement>('.menu'); if (a && nav) pill(nav, a) })
    on('pointerout', e => { const nav = (e.target as Element | null)?.closest<HTMLElement>('.menu'); if (nav && !nav.contains(e.relatedTarget as Node | null)) pill(nav, null) })
  }

  // ---- scroll reveal ----
  const adminOrPreview = () => !!document.querySelector('.adm') || new URLSearchParams(location.search).get('preview') === '1'
  const seen = new WeakSet<Element>()
  const io = new IntersectionObserver(entries => {
    for (const en of entries) if (en.isIntersecting) { const el = en.target as HTMLElement; io.unobserve(el); requestAnimationFrame(() => el.classList.add('mo-in')); setTimeout(() => { el.classList.remove('mo-pre'); el.style.removeProperty('--mo-d') }, 1900) }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 })
  const scan = (scope: ParentNode) => {
    if (adminOrPreview()) return
    for (const [sel, stagger] of REVEAL) {
      const list = Array.from(scope.querySelectorAll<HTMLElement>(sel)); if (scope instanceof HTMLElement && scope.matches(sel)) list.unshift(scope)
      list.forEach(el => {
      if (seen.has(el)) return; seen.add(el)
      if (el.closest('.mdl,.adm')) return
      const idx = stagger ? Array.prototype.indexOf.call(el.parentElement?.children ?? [], el) : 0
      el.style.setProperty('--mo-d', `${Math.min(idx, 8) * 70}ms`)
      el.classList.add('mo-pre'); io.observe(el)
      })
    }
  }
  scan(document)
  const mo = new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n as Element) }) })
  mo.observe(document.body, { childList: true, subtree: true })
  const safety = setInterval(() => document.querySelectorAll('.mo-pre:not(.mo-in)').forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0 && document.hidden === false) el.classList.add('mo-in') }), 2500)
  off.push(() => { io.disconnect(); mo.disconnect(); clearInterval(safety) })

  return () => off.forEach(f => f())
}
