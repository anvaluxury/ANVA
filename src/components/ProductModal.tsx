import { useEffect, useRef, useState } from 'react'
import { Lang } from '../../supabase/functions/auto-translate'
import { a } from '../i18n/admin'
import { h } from '../i18n/home'
import { useMoney } from '../lib/currency'
import { useFavs } from '../lib/favorites'
import { pick, storageUrl, t3, useContact } from '../lib/data'
import { supabase } from '../lib/supabase'
import { track } from '../lib/track'
import { effective, usePromos } from '../lib/pricing'
import ReviewBox from './ReviewBox'
import { Heart, Instagram, Phone, TikTok } from './Icons'
import { ModalSkeleton } from './Loaders'
import { lastPointer, prefersReduced } from '../lib/motion'
import { SITE, setSeo } from '../lib/seo'
import { useMediaLayouts, mediaStyle } from '../lib/mediaLayout'

type Tr = { lang: Lang; name: string; description: string | null }
type Img = { path: string; sort_order: number; is_main: boolean }
type Review = { rating: number; body: string | null }
type Product = { id: string; sku: string | null; price_amd: number; is_new: boolean; material: string | null; purity: string | null; status: string; product_translations: Tr[]; product_images: Img[] } & Record<string, unknown>

export default function ProductModal({ id, lang, onClose: onCloseNow }: { id: string; lang: Lang; onClose: () => void }) {
  const [closing, setClosing] = useState(false); const box = useRef<HTMLDivElement>(null); const closeRef = useRef(onCloseNow); closeRef.current = onCloseNow; const shut = useRef(false)
  // dialog leaves with the same motion it arrived with, then the route changes
  const onClose = () => { if (shut.current) return; shut.current = true; if (prefersReduced()) { closeRef.current(); return } setClosing(true); setTimeout(() => closeRef.current(), 260) }
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose
  // zoom out of the tapped card ("Zoom — opening an item from a grid")
  useEffect(() => { const el = box.current; if (!el || Date.now() - lastPointer.t > 2500 || innerWidth <= 820) return; const r = el.getBoundingClientRect(); el.style.transformOrigin = `${Math.max(0, Math.min(r.width, lastPointer.x - r.left))}px ${Math.max(0, Math.min(r.height, lastPointer.y - r.top))}px` }, [])
  const [p, setP] = useState<Product | null>(null); const [rv, setRv] = useState<{ avg: number; n: number; list: Review[] }>({ avg: 0, n: 0, list: [] }); const contact = useContact()
  const [i, setI] = useState(0); const [fullImage, setFullImage] = useState(false); const [missing, setMissing] = useState(false); const count = useRef(1)
  const { fmt, info } = useMoney(); const fav = useFavs(); const close = useRef<HTMLButtonElement>(null); const promos = usePromos(); const media = useMediaLayouts()
  useEffect(() => {
    track('product_view', { product_id: id, lang })
    void supabase.from('products').select('*,product_translations(lang,name,description),product_images(path,sort_order,is_main)').eq('id', id).eq('is_active', true).maybeSingle().then(({ data }) => data ? setP(data as Product) : setMissing(true))
    void supabase.from('reviews').select('rating,body,created_at').eq('product_id', id).eq('status', 'published').order('created_at', { ascending: false }).then(({ data }) => { const list = (data ?? []) as Review[]; const n = list.length; setRv({ n, avg: n ? list.reduce((s, r) => s + r.rating, 0) / n : 0, list }) })
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (document.querySelector('.product-image-fullscreen')) setFullImage(false); else onCloseRef.current() } if (!document.querySelector('.product-image-fullscreen') && e.key === 'ArrowRight') setI(v => Math.min(v + 1, count.current - 1)); if (!document.querySelector('.product-image-fullscreen') && e.key === 'ArrowLeft') setI(v => Math.max(v - 1, 0)) }
    addEventListener('keydown', key); document.body.style.overflow = 'hidden'; close.current?.focus()
    return () => { removeEventListener('keydown', key); document.body.style.overflow = '' }
  }, [id]) // eslint-disable-line
  const tr = pick(p?.product_translations, lang)
  const imgs = [...(p?.product_images ?? [])].sort((x, y) => Number(y.is_main) - Number(x.is_main) || x.sort_order - y.sort_order)
  count.current = Math.max(1, imgs.length); const eff = p ? effective(p, promos) : null; const price = eff?.price ?? 0
  const pub = (path: string) => storageUrl('product-images', path) ?? ''
  useEffect(() => { if (!tr || !p) return; const url = `${SITE}/${lang}/p/${id}`
    setSeo({ title: `${tr.name} — ANVA LUXURY`, description: (tr.description || tr.name).slice(0, 160), lang, path: `/p/${id}`, image: imgs[0] ? pub(imgs[0].path) : undefined,
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'Product', name: tr.name, description: tr.description ?? undefined, sku: p.sku ?? undefined, image: imgs.map(g => pub(g.path)), material: p.material ?? undefined, url,
        offers: { '@type': 'Offer', priceCurrency: 'AMD', price: Math.round(price), url, availability: p.status === 'sold_out' ? 'https://schema.org/SoldOut' : p.status === 'made_to_order' ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock' },
        ...(rv.n ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: rv.avg.toFixed(1), reviewCount: rv.n } } : {}) },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'ANVA', item: `${SITE}/${lang}` }, { '@type': 'ListItem', position: 2, name: tr.name, item: url }] }] })
  }, [tr?.name, tr?.description, lang, rv.n, imgs.length, p?.status, price]) // eslint-disable-line
  const order = (k: 'instagram' | 'tiktok' | 'phone') => { track(`order_${k}_click`, { product_id: id, lang }); const v = contact[k]; if (!v) return
    if (k === 'phone') location.href = `tel:${v.replace(/[^\d+]/g, '')}`; else { void navigator.clipboard?.writeText(`${tr?.name} — ${location.origin}/${lang}/p/${id}`).catch(() => {}); window.open(v, '_blank', 'noopener') } }
  return <div className={`mdl-back${closing ? ' is-closing' : ''}`} onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div ref={box} className="mdl" data-edit="product" role="dialog" aria-modal="true" aria-label={tr?.name ?? 'Product'}>
      <button ref={close} className="mdl-x" onClick={onClose} aria-label={t3(lang, 'Փակել', 'Закрыть', 'Close')}>✕</button>
      {missing ? <p className="empty">404</p> : !p ? <ModalSkeleton /> : <>
        <div className="mdl-gal">
          <div className="pd-stage" style={imgs[i] && media.get('product-images', imgs[i].path).aspect ? { aspectRatio: media.get('product-images', imgs[i].path).aspect } : undefined}>
            {imgs[i] ? <img className="pd-stage-image" onClick={() => setFullImage(true)} src={pub(imgs[i].path)} alt={tr?.name ?? ''} style={{ ...mediaStyle(media.get('product-images', imgs[i].path)), objectFit: 'contain', transform: 'none', padding: '0' }} /> : <span className="no-img">ANVA</span>}
            {imgs.length > 1 && <>
              <button className="gal-arrow prev" onClick={() => setI(v => (v - 1 + imgs.length) % imgs.length)} aria-label="Previous image">‹</button>
              <button className="gal-arrow next" onClick={() => setI(v => (v + 1) % imgs.length)} aria-label="Next image">›</button>
              <small className="gal-count">{i + 1} / {imgs.length}</small></>}
            {p.is_new && <span className="gal-new">{h(lang, 'new')}</span>}
          </div>
          {imgs.length > 1 && <div className="thumbs row">{imgs.map((g, k) => <button key={g.path} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`${k + 1}`} aria-pressed={k === i}><img src={pub(g.path)} alt="" loading="lazy" style={mediaStyle(media.get('product-images', g.path))} /></button>)}</div>}
        </div>
        <div className="info pd-info">
          <button className={`heart ${fav.has(id) ? 'on' : ''}`} onClick={() => fav.toggle(id)} aria-pressed={fav.has(id)} aria-label={h(lang, 'favorites')}><Heart size={20} filled={fav.has(id)} /></button>
          {p.is_new && <b className="tag">{h(lang, 'new')}</b>}<h2>{tr?.name}</h2>
          {rv.n > 0 && <div className="rating-line">★ {rv.avg.toFixed(1)} <span>({rv.n} {h(lang, 'reviews')})</span></div>}
          <div className="price"><strong>{fmt(price)}</strong>{eff && eff.pct > 0 && <><s>{fmt(Number(p.price_amd))}</s><em>-{eff.pct}%</em></>}</div>
          {!info.unavailable && <small className="base">{Number(p.price_amd).toLocaleString()} AMD</small>}
          <p>{tr?.description}</p>
          <ul className="facts"><li>{a(lang, 'material')}<small>{p.material ?? '—'}</small></li><li>{a(lang, 'purity')}<small>{p.purity ?? '—'}</small></li><li>{a(lang, 'status')}<small>{a(lang, p.status as 'available')}</small></li></ul>
          <div className="order"><span>{h(lang, 'order')}</span>{(['instagram', 'tiktok', 'phone'] as const).map(k => <button key={k} disabled={!contact[k]} onClick={() => order(k)} aria-label={k}>{k === 'instagram' ? <Instagram size={19} /> : k === 'tiktok' ? <TikTok size={19} /> : <Phone size={19} />}</button>)}</div>
          <ReviewBox id={id} lang={lang} list={rv.list} />
        </div></>}
    </div>
    {fullImage && imgs[i] && <div className="product-image-fullscreen" role="dialog" aria-modal="true" aria-label={tr?.name ?? 'Product image'} onClick={() => setFullImage(false)}>
      <button type="button" aria-label="Close image" onClick={() => setFullImage(false)}>✕</button>
      <img src={pub(imgs[i].path)} alt={tr?.name ?? ''} onClick={e => e.stopPropagation()} />
    </div>}
  </div>
}
