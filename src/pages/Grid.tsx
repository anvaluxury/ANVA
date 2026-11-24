import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { assets } from '../assets'
import CountrySelect from '../components/CountrySelect'
import ProductModal from '../components/ProductModal'
import { Lang } from '../i18n'
import { h } from '../i18n/home'
import { Heart, Search } from '../components/Icons'
import { useMoney } from '../lib/currency'
import { useFavs } from '../lib/favorites'
import { supabase } from '../lib/supabase'
import { track } from '../lib/track'
import { setSeo } from '../lib/seo'
import { effective, usePromos } from '../lib/pricing'
const pub = (p?: string) => (p ? supabase.storage.from('product-images').getPublicUrl(p).data.publicUrl : '')
export default function Grid({ lang, mode }: { lang: Lang; mode: 'category' | 'favorites' }) {
  const { slug, id } = useParams(); const nav = useNavigate(); const { fmt, suggest } = useMoney(); const fav = useFavs(); const promos = usePromos()
  const [rows, setRows] = useState<any[]>([]); const [title, setTitle] = useState(''); const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(''); const [sort, setSort] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured')
  useEffect(() => { suggest(lang); document.documentElement.lang = lang }, [lang]) // eslint-disable-line
  useEffect(() => { void (async () => {
    setLoading(true); const sel = '*,product_translations(lang,name),product_images(path,sort_order,is_main)'
    if (mode === 'category') {
      const { data: c } = await supabase.from('categories').select('id,category_translations(lang,name)').eq('slug', slug!).eq('is_active', true).maybeSingle()
      setTitle((c?.category_translations.find((t: any) => t.lang === lang) ?? c?.category_translations[0])?.name ?? ''); if (c) track('category_view', { category_id: c.id, lang })
      const { data } = c ? await supabase.from('products').select(sel).eq('category_id', c.id).eq('is_active', true).order('sort_order') : { data: [] }; setRows(data ?? [])
    } else { setTitle(h(lang, 'favorites')); const ids = [...fav.ids]; const { data } = ids.length ? await supabase.from('products').select(sel).in('id', ids).eq('is_active', true) : { data: [] }; setRows(data ?? []) }
    setLoading(false) })() }, [slug, mode, lang, fav.ids.size]) // eslint-disable-line
  useEffect(() => { if (!id && title) setSeo({ title: `${title} — ANVA LUXURY`, description: title, lang, path: mode === 'category' ? `/c/${slug}` : '', noindex: mode === 'favorites' }) }, [title, lang, id]) // eslint-disable-line
  const base = mode === 'category' ? `/${lang}/c/${slug}` : `/${lang}/favorites`
  const visibleRows = rows.filter(r => {
    const t = r.product_translations.find((x: any) => x.lang === lang) ?? r.product_translations[0]
    return (t?.name ?? '').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  }).sort((a, b) => {
    const pa = effective(a, promos).price, pb = effective(b, promos).price
    if (sort === 'price-asc') return pa - pb
    if (sort === 'price-desc') return pb - pa
    if (sort === 'name') {
      const an = (a.product_translations.find((x: any) => x.lang === lang) ?? a.product_translations[0])?.name ?? ''
      const bn = (b.product_translations.find((x: any) => x.lang === lang) ?? b.product_translations[0])?.name ?? ''
      return an.localeCompare(bn, lang)
    }
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })

  return <div className="home grid-page" style={{ backgroundImage: `url(${assets.backgrounds.silk})` }}>
    <header className="nav grid-nav">
      <Link to={`/${lang}`} className="grid-brand"><img src={assets.branding.logo} alt="ANVA LUXURY" width={104} /></Link>
      <div className="grid-nav-actions"><CountrySelect lang={lang} /><Link aria-label={h(lang, 'favorites')} to={`/${lang}/favorites`} className="grid-fav-link"><Heart size={19} /> <span>{h(lang, 'favorites')}</span></Link></div>
    </header>
    <section className="catalog-shell">
      <div className="catalog-heading">
        <div><span className="catalog-kicker">ANVA LUXURY · COLLECTION</span><h1>{title}</h1><p>{visibleRows.length} {lang === 'hy' ? 'ապրանք' : lang === 'ru' ? 'товаров' : 'pieces'}</p></div>
        <Link className="catalog-back" to={`/${lang}`}>← {lang === 'hy' ? 'Գլխավոր էջ' : lang === 'ru' ? 'На главную' : 'Home'}</Link>
      </div>
      <div className="catalog-tools">
        <label className="catalog-search"><Search size={19} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={lang === 'hy' ? 'Փնտրել ապրանք...' : lang === 'ru' ? 'Поиск товаров...' : 'Search pieces...'} /></label>
        <label className="catalog-sort"><span>{lang === 'hy' ? 'Դասավորել՝' : lang === 'ru' ? 'Сортировка:' : 'Sort:'}</span><select value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
          <option value="featured">{lang === 'hy' ? 'Առաջարկվող' : lang === 'ru' ? 'Рекомендуемые' : 'Featured'}</option>
          <option value="price-asc">{lang === 'hy' ? 'Գին՝ ցածրից բարձր' : lang === 'ru' ? 'Сначала дешевле' : 'Price: low to high'}</option>
          <option value="price-desc">{lang === 'hy' ? 'Գին՝ բարձրից ցածր' : lang === 'ru' ? 'Сначала дороже' : 'Price: high to low'}</option>
          <option value="name">{lang === 'hy' ? 'Անվանում' : lang === 'ru' ? 'По названию' : 'Name'}</option>
        </select></label>
      </div>
      {loading ? <div className="catalog-loading">ANVA LUXURY</div> : <div className="pgrid catalog-grid">{visibleRows.map(r => {
        const m = [...(r.product_images ?? [])].sort((a: any, b: any) => (b.is_main - a.is_main) || a.sort_order - b.sort_order)[0]
        const t = r.product_translations.find((x: any) => x.lang === lang) ?? r.product_translations[0]
        const price = effective(r, promos)
        return <article key={r.id} className="catalog-card">
          <Link to={`${base}/p/${r.id}`} className="catalog-image-link" aria-label={t?.name}>
            {m ? <img src={pub(m.path)} alt={t?.name} loading="lazy" /> : <span className="catalog-no-image">ANVA</span>}
            {r.is_new && <span className="catalog-new">{lang === 'hy' ? 'ՆՈՐ' : lang === 'ru' ? 'НОВИНКА' : 'NEW'}</span>}
          </Link>
          <button className={`catalog-heart ${fav.has(r.id) ? 'active' : ''}`} onClick={() => fav.toggle(r.id)} aria-label={h(lang, 'favorites')} aria-pressed={fav.has(r.id)}><Heart size={19} filled={fav.has(r.id)} /></button>
          <Link to={`${base}/p/${r.id}`} className="catalog-product-info"><span className="catalog-product-name">{t?.name}</span><strong>{fmt(price.price)}</strong>{price.pct > 0 && <small>{lang === 'hy' ? 'Զեղչ' : lang === 'ru' ? 'Скидка' : 'Sale'} · {price.pct}%</small>}</Link>
        </article>
      })}</div>}
      {!loading && !visibleRows.length && <p className="empty catalog-empty">{query ? (lang === 'hy' ? 'Որոնմամբ ապրանք չի գտնվել։' : lang === 'ru' ? 'Ничего не найдено.' : 'No pieces found.') : h(lang, 'empty')}</p>}
    </section>
    {id && <ProductModal id={id} lang={lang} onClose={() => nav(base)} />}
  </div>
}
