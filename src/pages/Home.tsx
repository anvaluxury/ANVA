import { CSSProperties, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { assets } from '../assets'
import { Lang } from '../i18n'
import { h, HKey } from '../i18n/home'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { track } from '../lib/track'
import { SITE, setSeo } from '../lib/seo'
import { effective, usePromos } from '../lib/pricing'
import { useMoney } from '../lib/currency'
import { useFavs } from '../lib/favorites'
import { pick, storageUrl, t3, tel, useContact } from '../lib/data'
import { useSiteConfig } from '../lib/siteConfig'
import { Heart, Instagram, Phone, TikTok } from '../components/Icons'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'
import ProductModal from '../components/ProductModal'
import HeroMedia from '../components/HeroMedia'

type Tr = { lang: Lang; name?: string; description?: string; title?: string; body?: string; button_label?: string }
type Img = { path: string; sort_order: number; is_main: boolean }
type Cat = { id: string; slug: string; image_path: string | null; category_translations: Tr[] }
type Prod = { id: string; price_amd: number; is_new: boolean; material: string | null; purity: string | null; product_translations: Tr[]; product_images: Img[] } & Record<string, unknown>
type Sec = { key: string; link: string | null; image_path: string | null; homepage_translations: Tr[] }

const fallback: Record<string, string> = { rings: assets.jewelry.ring, necklaces: assets.jewelry.necklace, earrings: assets.jewelry.earrings, bracelets: assets.jewelry.bracelet, crowns: assets.jewelry.crown, 'new-collection': assets.banners.sparkle }
const sortImgs = (a: Img[] = []) => [...a].sort((x, y) => Number(y.is_main) - Number(x.is_main) || x.sort_order - y.sort_order)

export default function Home({ lang, productId }: { lang: Lang; productId?: string }) {
  const nav = useNavigate(); const loc = useLocation(); const { fmt, suggest } = useMoney(); const fav = useFavs(); const T = (k: HKey) => h(lang, k)
  const { cfg, v, n, text } = useSiteConfig(); const contact = useContact()
  const [cats, setCats] = useState<Cat[]>([]); const [prod, setProd] = useState<Prod | null>(null); const [secs, setSecs] = useState<Record<string, Sec>>({})
  const [img, setImg] = useState(0); const [loading, setLoading] = useState(true); const promos = usePromos()

  useEffect(() => {
    document.documentElement.lang = lang; suggest(lang)
    if (!supabaseConfigured) { setLoading(false); return }
    track('page_view', { lang })
    void Promise.all([
      supabase.from('categories').select('id,slug,image_path,category_translations(lang,name)').eq('is_active', true).order('sort_order'),
      supabase.from('products').select('*,product_translations(lang,name,description),product_images(path,sort_order,is_main)').eq('is_featured', true).eq('is_active', true).maybeSingle(),
      supabase.from('homepage_sections').select('*,homepage_translations(lang,title,body,button_label)').eq('is_active', true),
    ]).then(([c, p, s]) => {
      setCats((c.data ?? []) as Cat[]); setProd((p.data ?? null) as Prod | null)
      setSecs(Object.fromEntries(((s.data ?? []) as Sec[]).map(r => [r.key, r])))
    }).finally(() => setLoading(false))
  }, [lang]) // eslint-disable-line

  // scroll to #section when arriving from another page
  useEffect(() => { if (loc.hash) setTimeout(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 80) }, [loc.hash, loading])

  const sec = (k: string) => { const row = secs[k]; const tr = pick(row?.homepage_translations, lang)
    return { row, title: text(k, lang, 'title', tr?.title), body: text(k, lang, 'body', tr?.body), button: text(k, lang, 'button', tr?.button_label) } }
  const hero = sec('hero'), about = sec('about'), banner = sec('banner')

  useEffect(() => { if (productId) return; const same = Object.values(contact).filter(x => /^https?:\/\//.test(x))
    setSeo({ title: `ANVA LUXURY${hero.title ? ' — ' + hero.title : ''}`, description: hero.body, lang, path: '', image: assets.branding.logo,
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'Organization', name: 'ANVA LUXURY', url: SITE, logo: SITE + assets.branding.logo, sameAs: same }, { '@context': 'https://schema.org', '@type': 'WebSite', name: 'ANVA LUXURY', url: `${SITE}/${lang}`, inLanguage: lang }] })
  }, [lang, productId, hero.title, hero.body, contact]) // eslint-disable-line

  const pt = pick(prod?.product_translations, lang)
  const gallery = sortImgs(prod?.product_images)
  const eff = prod ? effective(prod, promos) : null
  const order = (kind: 'instagram' | 'tiktok' | 'phone') => {
    track(`order_${kind}_click`, { product_id: prod?.id, lang }); const val = contact[kind]; if (!val) return
    if (kind === 'phone') location.href = `tel:${tel(val)}`; else window.open(val, '_blank', 'noopener')
  }

  const cols = n('cats.cols')
  const catStyle = (slug: string): CSSProperties => ({
    ['--fx' as string]: `${n(`cat.${slug}.fx`)}%`, ['--fy' as string]: `${n(`cat.${slug}.fy`)}%`, ['--z' as string]: n(`cat.${slug}.zoom`) / 100,
    gridColumn: `span ${Math.min(Number(v(`cat.${slug}.span`)) || 1, cols)}`,
  })
  const aboutImg = storageUrl('homepage-images', cfg.media.about || about.row?.image_path)
  const bannerImg = storageUrl('homepage-images', cfg.media.banner || banner.row?.image_path)

  return (
    <div className="site">
      <SiteHeader lang={lang} contact={contact} home />
      <main>
        <section className="hero on-media" id="top" data-edit="hero">
          <HeroMedia />
          <div className="hero-copy">
            {hero.title && <h1>{hero.title}</h1>}
            {hero.body && <p>{hero.body}</p>}
            {hero.button && <a className="btn-dark" href={hero.row?.link ?? '#collections'}>{hero.button}</a>}
          </div>
        </section>

        {cats.length > 0 && <section className="sec" id="collections" data-edit="cats">
          <div className="sec-head"><h2>{t3(lang, 'Բացահայտեք հավաքածուները', 'Откройте коллекции', 'Discover the collections')}</h2><p>{t3(lang, 'Ընտրեք Ձեր նախընտրած զարդերի տեսակը', 'Выберите категорию украшений', 'Explore pieces selected for your style')}</p></div>
          <div className="cats">
            {cats.map(c => { const src = storageUrl('category-images', c.image_path); const name = pick(c.category_translations, lang)?.name
              return <Link key={c.id} to={`/${lang}/c/${c.slug}`} className={`cat${src ? '' : ' ph'}`} style={catStyle(c.slug)} onClick={() => track('category_click', { category_id: c.id })}>
                <img loading="lazy" src={src ?? fallback[c.slug] ?? assets.diamonds.deco} alt="" /><span className="cat-name">{name}<i aria-hidden>→</i></span></Link> })}
          </div>
        </section>}

        <section className="sec feat-wrap" id="featured" data-edit="featured">
          <div className="sec-head"><h2>{t3(lang, 'Ընտրված զարդը', 'Избранное украшение', 'Featured piece')}</h2></div>
          <div className="feat">
            {loading ? <p className="empty" style={{ gridColumn: '1/-1' }}>…</p> : !prod ? <p className="empty" style={{ gridColumn: '1/-1' }}>{T('empty')}</p> : <>
              <div className="thumbs">{gallery.slice(0, 5).map((g, i) => <button key={g.path} className={i === img ? 'on' : ''} aria-label={`${i + 1}`} onClick={() => setImg(i)}><img loading="lazy" src={storageUrl('product-images', g.path)} alt="" /></button>)}</div>
              <div className="stage">{gallery[img] && <img src={storageUrl('product-images', gallery[img].path)} alt={pt?.name ?? ''} />}</div>
              <div className="info">
                <button className={`heart ${fav.has(prod.id) ? 'on' : ''}`} onClick={() => fav.toggle(prod.id)} aria-pressed={fav.has(prod.id)} aria-label={T('favorites')}><Heart size={20} filled={fav.has(prod.id)} /></button>
                {prod.is_new && <b className="tag">{T('new')}</b>}<h2>{pt?.name}</h2>
                <div className="price"><strong>{fmt(eff?.price ?? 0)}</strong>{eff && eff.pct > 0 && <><s>{fmt(Number(prod.price_amd))}</s><em>-{eff.pct}%</em></>}</div>
                <p>{pt?.description}</p>
                {prod.material && <ul className="facts"><li>{T('q')}<small>{prod.material}{prod.purity ? ` ${prod.purity}` : ''}</small></li></ul>}
                <div className="order"><span>{T('order')}</span>{(['instagram', 'tiktok', 'phone'] as const).map(k => <button key={k} onClick={() => order(k)} disabled={!contact[k]} aria-label={k}>{k === 'instagram' ? <Instagram size={19} /> : k === 'tiktok' ? <TikTok size={19} /> : <Phone size={19} />}</button>)}</div>
                <Link className="btn-light" to={`/${lang}/p/${prod.id}`}>{T('details')}</Link>
              </div></>}
          </div>
        </section>

        {(about.row || about.title) && <section className="sec about-wrap" id="about" data-edit="about">
          <div className="about">
            <div className="about-copy">{about.title && <h2>{about.title}</h2>}{about.body && <p>{about.body}</p>}{about.button && <a className="btn-light" href={about.row?.link ?? '#'}>{about.button}</a>}</div>
            <div className="art about-art">{aboutImg ? <img className="fill" src={aboutImg} alt="" loading="lazy" /> : <img className="mono" src={assets.branding.monogram} alt="" aria-hidden />}</div>
          </div>
        </section>}

        {(banner.row || banner.title) && <section className="sec banner-wrap" data-edit="banner">
          <div className="banner on-media">
            {bannerImg ? <img className="fill" src={bannerImg} alt="" loading="lazy" /> : <img className="art-ph" src={assets.jewelry.tennis} alt="" aria-hidden />}
            <div className="banner-copy">{banner.title && <h2>{banner.title}</h2>}{banner.body && <p>{banner.body}</p>}{banner.button && <a className="btn-dark" href={banner.row?.link ?? '#collections'}>{banner.button}</a>}</div>
          </div>
        </section>}
      </main>
      <SiteFooter lang={lang} contact={contact} />
      {productId && <ProductModal id={productId} lang={lang} onClose={() => nav(`/${lang}`)} />}
    </div>
  )
}
