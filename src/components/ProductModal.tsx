import { useEffect, useRef, useState } from 'react'
import { Lang } from '../i18n'
import { a } from '../i18n/admin'
import { h } from '../i18n/home'
import { useMoney } from '../lib/currency'
import { useFavs } from '../lib/favorites'
import { supabase } from '../lib/supabase'
import { track } from '../lib/track'
import { effective, usePromos } from '../lib/pricing'
import ReviewBox from './ReviewBox'
import { Heart, Instagram, Phone, TikTok } from './Icons'
import { SITE, setSeo } from '../lib/seo'
const pick = (arr: any[] | undefined, l: Lang) => arr?.find(x => x.lang === l) ?? arr?.find(x => x.lang === 'en') ?? arr?.[0]
const pub = (p: string) => supabase.storage.from('product-images').getPublicUrl(p).data.publicUrl
export default function ProductModal({ id, lang, onClose }: { id: string; lang: Lang; onClose: () => void }) {
  const [p, setP] = useState<any>(null); const [rv, setRv] = useState<{ avg: number; n: number; list: any[] }>({ avg: 0, n: 0, list: [] }); const [contact, setContact] = useState<Record<string, string>>({})
  const [i, setI] = useState(0); const [spin, setSpin] = useState(false); const [missing, setMissing] = useState(false); const imgsCount = useRef(1)
  const { fmt, info } = useMoney(); const fav = useFavs(); const close = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    track('product_view', { product_id: id, lang })
    void supabase.from('products').select('*,product_translations(lang,name,description),product_images(path,sort_order,is_main)').eq('id', id).eq('is_active', true).maybeSingle().then(({ data }) => data ? setP(data) : setMissing(true))
    void supabase.from('reviews').select('rating,body,created_at').eq('product_id', id).eq('status', 'published').order('created_at', { ascending: false }).then(({ data }) => { const n = data?.length ?? 0; setRv({ n, avg: n ? data!.reduce((s: number, r: any) => s + r.rating, 0) / n : 0, list: data ?? [] }) })
    void supabase.from('site_settings').select('value').eq('key', 'contact').maybeSingle().then(({ data }) => setContact(data?.value ?? {}))
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') setI(v => Math.min(v + 1, imgsCount.current - 1)); if (e.key === 'ArrowLeft') setI(v => Math.max(v - 1, 0)) }; addEventListener('keydown', key)
    document.body.style.overflow = 'hidden'; close.current?.focus()
    return () => { removeEventListener('keydown', key); document.body.style.overflow = '' }
  }, [id]) // eslint-disable-line
  const tr = pick(p?.product_translations, lang)
  const imgs = [...(p?.product_images ?? [])].sort((x: any, y: any) => (y.is_main - x.is_main) || x.sort_order - y.sort_order)
  imgsCount.current = Math.max(1, imgs.length); const promos = usePromos(); const eff = p ? effective(p, promos) : null; const price = eff?.price ?? 0
  useEffect(() => { if (!tr || !p) return; const url = `${SITE}/${lang}/p/${id}`
    setSeo({ title: `${tr.name} — ANVA LUXURY`, description: (tr.description || tr.name).slice(0, 160), lang, path: `/p/${id}`, image: imgs[0] ? pub(imgs[0].path) : undefined,
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'Product', name: tr.name, description: tr.description ?? undefined, sku: p.sku ?? undefined, image: imgs.map((g: any) => pub(g.path)), material: p.material ?? undefined, url,
        offers: { '@type': 'Offer', priceCurrency: 'AMD', price: Math.round(price), url, availability: p.status === 'sold_out' ? 'https://schema.org/SoldOut' : p.status === 'made_to_order' ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock' },
        ...(rv.n ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: rv.avg.toFixed(1), reviewCount: rv.n } } : {}) },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'ANVA', item: `${SITE}/${lang}` }, { '@type': 'ListItem', position: 2, name: tr.name, item: url }] }] })
  }, [tr?.name, tr?.description, lang, rv.n, imgs.length, p?.status, price]) // eslint-disable-line
  const order = (k: 'instagram' | 'tiktok' | 'phone') => { track(`order_${k}_click`, { product_id: id, lang }); const v = contact[k]; if (!v) return
    if (k === 'phone') location.href = `tel:${v.replace(/[^\d+]/g, '')}`; else { void navigator.clipboard?.writeText(`${tr?.name} — ${location.origin}/${lang}/p/${id}`).catch(() => {}); window.open(v, '_blank', 'noopener') } }
  return <div className="mdl-back" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="mdl glass" role="dialog" aria-modal="true" aria-label={tr?.name ?? 'Product'}>
      <button ref={close} className="mdl-x" onClick={onClose} aria-label="Close">✕</button>
      {missing ? <p className="empty">404</p> : !p ? <p className="empty">…</p> : <>
        <div className="mdl-gal product-gallery">
          <div className="product-gallery-top"><span>ANVA LUXURY <i>／</i> DETAILS</span>{imgs.length > 0 && <small>{String(i + 1).padStart(2, '0')} <b>/</b> {String(imgs.length).padStart(2, '0')}</small>}</div>
          <div className="stage product-stage">
            {imgs[i] ? <img src={pub(imgs[i].path)} alt={tr?.name ?? ''} /> : <span className="product-no-image">ANVA LUXURY</span>}
            {imgs.length > 1 && <>
              <button className="gallery-arrow prev" onClick={() => setI(v => (v - 1 + imgs.length) % imgs.length)} aria-label="Previous image">‹</button>
              <button className="gallery-arrow next" onClick={() => setI(v => (v + 1) % imgs.length)} aria-label="Next image">›</button>
            </>}
            {p.is_new && <span className="gallery-label">{h(lang, 'new')}</span>}
          </div>
          {imgs.length > 1 && <div className="thumbs row product-thumbs">{imgs.map((g: any, k: number) => <button key={g.path} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`View image ${k + 1}`} aria-pressed={k === i}><img src={pub(g.path)} alt="" loading="lazy" /></button>)}</div>}
          {imgs.length > 1 && <div className="product-360"><button className="btn-light sm" onClick={() => setSpin(s => !s)}>{spin ? 'Close 360° view' : 'Explore 360°'}</button>{spin && <input type="range" min={0} max={imgs.length - 1} value={i} onChange={e => setI(+e.target.value)} aria-label="360°" />}</div>}
        </div>
        <div className="info product-info"><div className="product-eyebrow">ANVA LUXURY <span>•</span> FINE JEWELLERY</div><button className={`heart ${fav.has(id) ? 'on' : ''}`} onClick={() => fav.toggle(id)} aria-pressed={fav.has(id)} aria-label={h(lang, 'favorites')}><Heart size={26} filled={fav.has(id)} /></button>
          {p.is_new && <b className="tag">{h(lang, 'new')}</b>}<h2>{tr?.name}</h2>
          <div className="product-rating-line">{rv.n ? <>★ {rv.avg.toFixed(1)} <span>({rv.n} {h(lang, 'reviews')})</span></> : <span>NEW COLLECTION</span>}</div>
          <div className="price product-price"><strong>{fmt(price)}</strong>{eff && eff.pct > 0 && <><s>{fmt(p.price_amd)}</s><em>-{eff.pct}%</em></>}</div>
          {info.unavailable ? null : <small className="base">{Number(p.price_amd).toLocaleString()} AMD</small>}
          <p>{tr?.description}</p>
          <ul className="facts product-facts"><li>{a(lang, 'material')}<small>{p.material ?? '—'}</small></li><li>{a(lang, 'purity')}<small>{p.purity ?? '—'}</small></li><li>{a(lang, 'status')}<small>{a(lang, p.status)}</small></li></ul>
          <ReviewBox id={id} lang={lang} list={rv.list} />
          <div className="product-order-caption">{h(lang, 'order')}</div><div className="btn-dark order product-order"><span>{h(lang, 'order')}</span>{(['instagram', 'tiktok', 'phone'] as const).map(k => <button key={k} disabled={!contact[k]} onClick={() => order(k)} aria-label={k}>{k === 'instagram' ? <Instagram /> : k === 'tiktok' ? <TikTok /> : <Phone />}</button>)}</div>
        </div></>}
    </div></div>
}
