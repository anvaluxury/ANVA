import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ProductModal from '../components/ProductModal'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'
import { Heart, Search } from '../components/Icons'
import { Lang } from '../i18n'
import { h } from '../i18n/home'
import { useMoney } from '../lib/currency'
import { useFavs } from '../lib/favorites'
import { pick, storageUrl, t3, useContact } from '../lib/data'
import { effective, usePromos } from '../lib/pricing'
import { setSeo } from '../lib/seo'
import { supabase } from '../lib/supabase'
import { track } from '../lib/track'

type Tr = { lang: Lang; name: string }
type Row = { id: string; sort_order: number | null; is_new: boolean; price_amd: number; product_translations: Tr[]; product_images: { path: string; sort_order: number; is_main: boolean }[] } & Record<string, unknown>
type Sort = 'featured' | 'price-asc' | 'price-desc' | 'name'

export default function Grid({ lang, mode }: { lang: Lang; mode: 'category' | 'favorites' }) {
  const { slug, id } = useParams(); const nav = useNavigate(); const { fmt, suggest } = useMoney(); const fav = useFavs(); const promos = usePromos(); const contact = useContact()
  const [rows, setRows] = useState<Row[]>([]); const [title, setTitle] = useState(''); const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(''); const [sort, setSort] = useState<Sort>('featured')
  useEffect(() => { suggest(lang); document.documentElement.lang = lang }, [lang]) // eslint-disable-line

  useEffect(() => { void (async () => {
    setLoading(true); const sel = '*,product_translations(lang,name),product_images(path,sort_order,is_main)'
    if (mode === 'category') {
      const { data: c } = await supabase.from('categories').select('id,category_translations(lang,name)').eq('slug', slug!).eq('is_active', true).maybeSingle()
      setTitle(pick(c?.category_translations as Tr[] | undefined, lang)?.name ?? ''); if (c) track('category_view', { category_id: c.id, lang })
      const { data } = c ? await supabase.from('products').select(sel).eq('category_id', c.id).eq('is_active', true).order('sort_order') : { data: [] }; setRows((data ?? []) as Row[])
    } else {
      setTitle(h(lang, 'favorites')); const ids = [...fav.ids]
      const { data } = ids.length ? await supabase.from('products').select(sel).in('id', ids).eq('is_active', true) : { data: [] }; setRows((data ?? []) as Row[])
    }
    setLoading(false) })() }, [slug, mode, lang, fav.ids.size]) // eslint-disable-line
  useEffect(() => { if (!id && title) setSeo({ title: `${title} — ANVA LUXURY`, description: title, lang, path: mode === 'category' ? `/c/${slug}` : '', noindex: mode === 'favorites' }) }, [title, lang, id]) // eslint-disable-line

  const base = mode === 'category' ? `/${lang}/c/${slug}` : `/${lang}/favorites`
  const name = (r: Row) => pick(r.product_translations, lang)?.name ?? ''
  const visible = useMemo(() => rows.filter(r => name(r).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => {
    const pa = effective(a, promos).price, pb = effective(b, promos).price
    if (sort === 'price-asc') return pa - pb; if (sort === 'price-desc') return pb - pa
    if (sort === 'name') return name(a).localeCompare(name(b), lang)
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  }), [rows, query, sort, promos, lang]) // eslint-disable-line

  return <div className="site">
    <SiteHeader lang={lang} contact={contact} langPath={mode === 'category' ? `/c/${slug}` : '/favorites'} />
    <main className="sec page-sec" data-edit="grid">
      <div className="page-head">
        <div><h1>{title}</h1><p>{visible.length} {t3(lang, 'ապրանք', 'товаров', 'pieces')}</p></div>
        <Link className="btn-light sm" to={`/${lang}`}>← {t3(lang, 'Գլխավոր էջ', 'На главную', 'Home')}</Link>
      </div>
      <div className="tools">
        <label className="search"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t3(lang, 'Փնտրել ապրանք...', 'Поиск товаров...', 'Search pieces...')} aria-label={t3(lang, 'Որոնում', 'Поиск', 'Search')} /></label>
        <label className="sort"><span>{t3(lang, 'Դասավորել՝', 'Сортировка:', 'Sort:')}</span><select value={sort} onChange={e => setSort(e.target.value as Sort)}>
          <option value="featured">{t3(lang, 'Առաջարկվող', 'Рекомендуемые', 'Featured')}</option>
          <option value="price-asc">{t3(lang, 'Գին՝ ցածրից բարձր', 'Сначала дешевле', 'Price: low to high')}</option>
          <option value="price-desc">{t3(lang, 'Գին՝ բարձրից ցածր', 'Сначала дороже', 'Price: high to low')}</option>
          <option value="name">{t3(lang, 'Անվանում', 'По названию', 'Name')}</option></select></label>
      </div>
      {loading ? <p className="empty">…</p> : <div className="pgrid">{visible.map(r => {
        const m = [...r.product_images].sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.sort_order - b.sort_order)[0]
        const price = effective(r, promos)
        return <article key={r.id} className="pcard">
          <Link to={`${base}/p/${r.id}`} className="pcard-img" aria-label={name(r)}>
            {m ? <img src={storageUrl('product-images', m.path)} alt={name(r)} loading="lazy" /> : <span className="no-img">ANVA</span>}
            {r.is_new && <span className="pcard-new">{h(lang, 'new')}</span>}
          </Link>
          <button className={`pcard-heart ${fav.has(r.id) ? 'on' : ''}`} onClick={() => fav.toggle(r.id)} aria-label={h(lang, 'favorites')} aria-pressed={fav.has(r.id)}><Heart size={18} filled={fav.has(r.id)} /></button>
          <Link to={`${base}/p/${r.id}`} className="pcard-info"><span>{name(r)}</span><strong>{fmt(price.price)}</strong>{price.pct > 0 && <small>{t3(lang, 'Զեղչ', 'Скидка', 'Sale')} −{price.pct}%</small>}</Link>
        </article>
      })}</div>}
      {!loading && !visible.length && <p className="empty">{query ? t3(lang, 'Որոնմամբ ապրանք չի գտնվել։', 'Ничего не найдено.', 'No pieces found.') : h(lang, 'empty')}</p>}
    </main>
    <SiteFooter lang={lang} contact={contact} />
    {id && <ProductModal id={id} lang={lang} onClose={() => nav(base)} />}
  </div>
}
