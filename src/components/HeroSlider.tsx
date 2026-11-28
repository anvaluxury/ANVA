import { useEffect, useRef, useState } from 'react'

export type HeroSlide = { id: string; image: string; title: string; body: string; button: string; link: string }

function Sparkles() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; const ctx = c?.getContext('2d'); if (!c || !ctx) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const dpr = Math.min(devicePixelRatio || 1, 2); let w = 0, h = 0, raf = 0
    const fit = () => { w = c.clientWidth; h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0) }
    fit(); addEventListener('resize', fit)
    const P = Array.from({ length: w < 700 ? 36 : 80 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.8 + 0.4, v: Math.random() * 0.25 + 0.05, p: Math.random() * 6.28, s: Math.random() * 0.02 + 0.008 }))
    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      for (const q of P) {
        q.y -= q.v; q.p += q.s; if (q.y < -4) { q.y = h + 4; q.x = Math.random() * w }
        ctx.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(q.p)); ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 8
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }
    tick(); return () => { cancelAnimationFrame(raf); removeEventListener('resize', fit) }
  }, [])
  return <canvas ref={ref} className="hs-sparks" aria-hidden />
}

export default function HeroSlider({ slides }: { slides: HeroSlide[]; logo: string }) {
  const [i, setI] = useState(0); const [hold, setHold] = useState(false); const x0 = useRef(0); const n = slides.length
  const go = (d: number) => setI(v => (v + d + n) % n)
  useEffect(() => { if (n < 2 || hold) return; const t = setInterval(() => setI(v => (v + 1) % n), 6500); return () => clearInterval(t) }, [n, hold, i])
  return (
    <section className="hslider" id="top" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}
      onTouchStart={e => { x0.current = e.touches[0].clientX }} onTouchEnd={e => { const d = e.changedTouches[0].clientX - x0.current; if (Math.abs(d) > 50) go(d < 0 ? 1 : -1) }}>
      {slides.map((sl, k) => <div key={sl.id} className={`hs-bg${k === i ? ' on' : ''}`} aria-hidden>{sl.image && <img src={sl.image} alt="" loading={k === 0 ? 'eager' : 'lazy'} />}</div>)}
      <div className="hs-shade" aria-hidden="true" />
      {n > 1 && <>
        <button className="hs-ar l" aria-label="Previous" onClick={() => go(-1)}>‹</button>
        <button className="hs-ar r" aria-label="Next" onClick={() => go(1)}>›</button>
        <div className="hs-dots">{slides.map((sl, k) => <button key={sl.id} className={k === i ? 'on' : ''} aria-label={`Slide ${k + 1}`} onClick={() => setI(k)} />)}</div>
      </>}
    </section>
  )
}
