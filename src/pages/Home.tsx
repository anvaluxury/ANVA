import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../assets'
import { LANGS, Lang } from '../i18n'
import { h, HKey } from '../i18n/home'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { track } from '../lib/track'
import { SITE, setSeo } from '../lib/seo'
import { effective, usePromos } from '../lib/pricing'
import { useMoney } from '../lib/currency'
import { useFavs } from '../lib/favorites'
import CountrySelect from '../components/CountrySelect'
import { Close, Heart, Instagram, Mail, Menu, Phone, TikTok, User } from '../components/Icons'
import ProductModal from '../components/ProductModal'

type Tr = { lang: Lang; name?: string; description?: string; title?: string; body?: string; button_label?: string }
const tel = (v: string) => v.replace(/[^\d+]/g, '')
const pick = <T extends { lang: Lang }>(a: T[] | null | undefined, l: Lang) => a?.find(x => x.lang === l) ?? a?.find(x => x.lang === 'en') ?? a?.[0]
const url = (bucket: string, path?: string | null) => path ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : undefined
const fallback: Record<string, string> = { rings: assets.jewelry.ring, necklaces: assets.jewelry.necklace, earrings: assets.jewelry.earrings, bracelets: assets.jewelry.bracelet, crowns: assets.jewelry.crown, 'new-collection': assets.banners.sparkle }

export default function Home({ lang, productId }: { lang: Lang; productId?: string }) {
  const nav = useNavigate(); const { fmt, suggest } = useMoney(); const fav = useFavs(); const T = (k: HKey) => h(lang, k)
  const [cats, setCats] = useState<any[]>([]); const [prod, setProd] = useState<any>(null); const [secs, setSecs] = useState<Record<string, any>>({})
  const [contact, setContact] = useState<Record<string, string>>({}); const [img, setImg] = useState(0); const [loading, setLoading] = useState(true)
  const [menu, setMenu] = useState(false); const [mail, setMail] = useState(''); const [sub, setSub] = useState<HKey | null>(null)

  useEffect(() => {
    document.documentElement.lang = lang; suggest(lang)
    if (!supabaseConfigured) return setLoading(false)
    track('page_view', { lang })
    Promise.all([
      supabase.from('categories').select('id,slug,image_path,category_translations(lang,name)').eq('is_active', true).order('sort_order'),
      supabase.from('products').select('*,product_translations(lang,name,description),product_images(path,sort_order,is_main)').eq('is_featured', true).eq('is_active', true).maybeSingle(),
      supabase.from('homepage_sections').select('*,homepage_translations(lang,title,body,button_label)').eq('is_active', true),
      supabase.from('site_settings').select('value').eq('key', 'contact').maybeSingle(),
    ]).then(([c, p, s, st]) => {
      setCats(c.data ?? []); setProd(p.data); setSecs(Object.fromEntries((s.data ?? []).map((r: any) => [r.key, r]))); setContact(st.data?.value ?? {})
    }).finally(() => setLoading(false))
  }, [lang])

  const sec0 = secs.hero?.homepage_translations
  useEffect(() => { if (productId) return; const t0 = pick<Tr>(sec0, lang); const same = Object.values(contact).filter(v => /^https?:\/\//.test(v))
    setSeo({ title: `ANVA LUXURY${t0?.title ? ' — ' + t0.title : ''}`, description: t0?.body, lang, path: '', image: assets.branding.logo,
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'Organization', name: 'ANVA LUXURY', url: SITE, logo: SITE + assets.branding.logo, sameAs: same }, { '@context': 'https://schema.org', '@type': 'WebSite', name: 'ANVA LUXURY', url: `${SITE}/${lang}`, inLanguage: lang }] }) }, [lang, productId, sec0, contact]) // eslint-disable-line
  const sec = (k: string) => ({ row: secs[k], tr: pick<Tr>(secs[k]?.homepage_translations, lang) })
  const hero = sec('hero'), about = sec('about'), banner = sec('banner')
  const pt = pick<Tr>(prod?.product_translations, lang)
  const gallery = [...(prod?.product_images ?? [])].sort((a: any, b: any) => (b.is_main - a.is_main) || a.sort_order - b.sort_order)
  const promos = usePromos(); const eff = prod ? effective(prod, promos) : null; const price = eff?.price ?? 0

  const order = (kind: 'instagram' | 'tiktok' | 'phone') => {
    track(`order_${kind}_click`, { product_id: prod?.id, lang })
    const v = contact[kind]; if (!v) return
    if (kind === 'phone') location.href = `tel:${tel(v)}`; else window.open(v, '_blank', 'noopener')
  }
  async function subscribe(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('newsletter_subscribers').insert({ email: mail.trim() })
    setSub(!error ? 'sub_ok' : error.code === '23505' ? 'sub_dup' : 'sub_err'); if (!error) { setMail(''); track('newsletter_subscribe', { lang }) }
  }

  return (
    <div className="home" style={{ backgroundImage: `url(${assets.backgrounds.silk})` }}>
      <header className="nav">
        <button className="burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(m => !m)}>{menu ? <Close /> : <Menu />}</button>
        <nav className={`glass pill${menu ? ' open' : ''}`} onClick={e => (e.target as HTMLElement).closest('a') && setMenu(false)}>
          <a className="on" href="#top">{T('home')}</a><a href="#collections">{T('collections')}</a><a href="#featured">{T('shop')}</a><a href="#about">{T('about')}</a><a href="#footer">{T('journal')}</a><a href="#footer">{T('contact')}</a>
          <div className="csel-mob"><CountrySelect lang={lang} /></div></nav>
        <div className="icons">
          <span className="lg-btns">{LANGS.map(l => <button key={l} className={`lg ${l === lang ? 'on' : ''}`} onClick={() => nav(`/${l}`)}>{l.toUpperCase()}</button>)}</span>
          <select className="lg-sel" value={lang} aria-label="Language" onChange={e => nav(`/${e.target.value}`)}>{LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}</select>
          <span className="csel-desk"><CountrySelect lang={lang} /></span>
          <Link aria-label={T('favorites')} to={`/${lang}/favorites`}><Heart /></Link><Link aria-label={T('account')} to={`/${lang}/account`}><User /></Link>
        </div></header>

      <section className="hero" id="top">
        <img className="logo" src={assets.branding.logo} alt="ANVA LUXURY" />
        <div className="copy"><h1>{hero.tr?.title}</h1><p>{hero.tr?.body}</p>
          <a className="btn-dark" href={hero.row?.link ?? '#collections'}>{hero.tr?.button_label} →</a>
          <div className="scroll"><i />{T('scroll')}</div></div>
        <div className="h-art"><img className="h-rib" src={assets.chrome.podiumOrbit} alt="" aria-hidden /><img className="h-ring" src={assets.jewelry.ringPave} alt="ANVA ring" />
        <img className="gem a" src={assets.diamonds.faceted} alt="" aria-hidden /><img className="gem b" src={assets.diamonds.facetedAlt} alt="" aria-hidden /><img className="gem c" src={assets.diamonds.photoreal} alt="" aria-hidden /></div>
      </section>

      <section className="home-collections" id="collections">
        <div className="home-section-head">
          <span className="home-kicker">ANVA LUXURY · COLLECTIONS</span>
          <h2>{lang === 'hy' ? 'Բացահայտեք հավաքածուները' : lang === 'ru' ? 'Откройте коллекции' : 'Discover the collections'}</h2>
          <p>{lang === 'hy' ? 'Ընտրեք ձեր նախընտրած զարդերի տեսակը' : lang === 'ru' ? 'Выберите категорию украшений' : 'Explore pieces selected for your style'}</p>
        </div>
        <div className="cats">
        {cats.map(c => <Link key={c.id} to={`/${lang}/c/${c.slug}`} className="glass cat" onClick={() => track('category_click', { category_id: c.id })}>
          <img loading="lazy" src={url('category-images', c.image_path) ?? fallback[c.slug] ?? assets.diamonds.deco} alt="" /><span>{pick<Tr>(c.category_translations, lang)?.name}<i className="arr"> →</i></span></Link>)}
        </div>
      </section>

      <section className="home-featured-intro">
        <span className="home-kicker">ANVA LUXURY · EDITOR'S CHOICE</span>
        <h2>{lang === 'hy' ? 'Ընտրված զարդը' : lang === 'ru' ? 'Избранное украшение' : 'Featured piece'}</h2>
      </section>
      <section className="glass feat" id="featured">
        {loading ? <p className="empty">…</p> : !prod ? <p className="empty">{T('empty')}</p> : <>
          <div className="thumbs">{gallery.slice(0, 5).map((g: any, i: number) => <button key={g.path} className={i === img ? 'on' : ''} onClick={() => setImg(i)}><img loading="lazy" src={url('product-images', g.path)} alt="" /></button>)}</div>
          <div className="stage">{gallery[img] && <img src={url('product-images', gallery[img].path)} alt={pt?.name ?? ''} />}</div>
          <div className="info">
            <button className={`heart ${fav.has(prod.id) ? 'on' : ''}`} onClick={() => fav.toggle(prod.id)} aria-pressed={fav.has(prod.id)} aria-label={T('favorites')}><Heart size={26} filled={fav.has(prod.id)} /></button>{prod.is_new && <b className="tag">{T('new')}</b>}<h2>{pt?.name}</h2>
            <div className="price"><strong>{fmt(price)}</strong>{eff && eff.pct > 0 && <><s>{fmt(prod.price_amd)}</s><em>-{eff.pct}%</em></>}</div>
            <p>{pt?.description}</p>
            <ul className="facts">{prod.material && <li>{T('q')}<small>{prod.material}{prod.purity ? ` ${prod.purity}` : ''}</small></li>}</ul>
            <div className="btn-dark order"><span>{T('order')}</span>
              {(['instagram', 'tiktok', 'phone'] as const).map(k => <button key={k} onClick={() => order(k)} disabled={!contact[k]} aria-label={k}>{k === 'instagram' ? <Instagram /> : k === 'tiktok' ? <TikTok /> : <Phone />}</button>)}</div>
            <Link className="btn-light" to={`/${lang}/p/${prod.id}`}>{T('details')} →</Link>
          </div></>}
      </section>

      <section className="about" id="about">
        <div><small>{T('about').toUpperCase()}</small><h2>{about.tr?.title}</h2><p>{about.tr?.body}</p><a className="btn-light" href={about.row?.link ?? '#'}>{about.tr?.button_label} →</a></div>
        <img src={url('homepage-images', about.row?.image_path) ?? assets.editorial.portrait} alt="" loading="lazy" />
      </section>

      <section className="banner">
        <div><h2>{banner.tr?.title}</h2><p>{banner.tr?.body}</p><a className="btn-dark" href={banner.row?.link ?? '#collections'}>{banner.tr?.button_label} →</a></div>
        <img src={url('homepage-images', banner.row?.image_path) ?? assets.jewelry.tennis} alt="" loading="lazy" />
      </section>

      {productId && <ProductModal id={productId} lang={lang} onClose={() => nav(`/${lang}`)} />}
      <footer id="footer" className="foot">
        <img src={assets.branding.logo} alt="ANVA" />
        <div><h4>{T('quick')}</h4><a href="#featured">{T('shop')}</a><a href="#collections">{T('collections')}</a><a href="#about">{T('about')}</a></div>
        <div><h4>{T('care')}</h4><a href="#footer">{T('faq')}</a><a href="#footer">{T('ship')}</a><a href="#footer">{T('ret')}</a></div>
        <div><h4>{T('follow')}</h4>
          {contact.phone && <a className="cline" href={`tel:${tel(contact.phone)}`}><Phone size={16} /> {contact.phone}</a>}
          {contact.email && <a className="cline" href={`mailto:${contact.email}`}><Mail size={16} /> {contact.email}</a>}
          <p className="soc">{(['instagram', 'tiktok', 'facebook', 'youtube', 'pinterest'] as const).filter(k => contact[k]).map(k => <a key={k} href={contact[k]} target="_blank" rel="noopener noreferrer" aria-label={k}>{k === 'instagram' ? <Instagram size={24} /> : k === 'tiktok' ? <TikTok size={24} /> : k}</a>)}</p></div>
        <form onSubmit={subscribe}><input type="email" required value={mail} onChange={e => setMail(e.target.value)} placeholder={T('email')} /><button className="btn-dark">{T('sub')}</button>{sub && <p role="status">{T(sub)}</p>}</form>
        <small className="copy-r">© {new Date().getFullYear()} ANVA. {T('rights')}</small>
      </footer>
    </div>)
}