import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { assets } from '../assets'
import { Lang, LANGS } from '../i18n'
import { a } from '../i18n/admin'
import { useSession } from '../lib/auth'
import { COUNTRIES } from '../lib/currency'
import { useFavs } from '../lib/favorites'
import { supabase } from '../lib/supabase'
import { setSeo } from '../lib/seo'

type Profile = { full_name: string; preferred_language: string; country: string }
type Review = { rating: number; body: string; status: string; products?: { product_translations?: { lang: string; name: string }[] } | null }

export default function Account({ lang }: { lang: Lang }) {
  const s = useSession()
  const nav = useNavigate()
  const favs = useFavs()
  const T = (k: any) => a(lang, k)
  const [p, setP] = useState<Profile>({ full_name: '', preferred_language: lang, country: 'AM' })
  const [rv, setRv] = useState<Review[]>([])
  const [msg, setMsg] = useState('')
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!s.user) return
    let active = true
    setLoadingData(true)
    void Promise.all([
      supabase.from('profiles').select('full_name,preferred_language,country').eq('id', s.user.id).maybeSingle(),
      supabase.from('reviews').select('rating,body,status,products(product_translations(lang,name))').eq('user_id', s.user.id).order('created_at', { ascending: false })
    ]).then(([profileResult, reviewResult]) => {
      if (!active) return
      if (profileResult.data) setP({
        full_name: profileResult.data.full_name ?? '',
        preferred_language: profileResult.data.preferred_language ?? lang,
        country: profileResult.data.country ?? 'AM'
      })
      setRv((reviewResult.data ?? []) as unknown as Review[])
      setLoadingData(false)
    })
    return () => { active = false }
  }, [s.user?.id]) // eslint-disable-line

  useEffect(() => setSeo({ title: `ANVA — ${a(lang, 'profile')}`, lang, noindex: true }), [lang])

  const initials = useMemo(() => {
    const parts = p.full_name.trim().split(/\s+/).filter(Boolean)
    return (parts.length ? `${parts[0][0] ?? ''}${parts[1]?.[0] ?? ''}` : (s.user?.email?.[0] ?? 'A')).toUpperCase()
  }, [p.full_name, s.user?.email])

  if (s.loading) return <div className="account-loading" aria-label="Loading" />
  if (!s.user) return <Navigate to={`/${lang}/login`} replace />

  const save = async () => {
    setSaving(true)
    setMsg('')
    const { error } = await supabase.from('profiles').update({
      full_name: p.full_name.trim(),
      preferred_language: p.preferred_language,
      country: p.country
    }).eq('id', s.user!.id)
    setSaving(false)
    if (error) return setMsg(`${T('err')}: ${error.message}`)
    localStorage.setItem('anva_country', p.country)
    localStorage.setItem('anva_country_manual', '1')
    setMsg(T('saved'))
    if (p.preferred_language !== lang) nav(`/${p.preferred_language}/account`)
  }

  const countryName = new Intl.DisplayNames([lang], { type: 'region' }).of(p.country) ?? p.country

  return (
    <div className="home grid-page account-page" style={{ backgroundImage: `url(${assets.backgrounds.silk})` }}>
      <header className="nav account-nav">
        <Link to={`/${lang}`} aria-label="ANVA LUXURY home"><img src={assets.branding.logo} alt="ANVA" width={90} /></Link>
        <Link className="account-back-link" to={`/${lang}`}>← <span>{lang === 'hy' ? 'Գլխավոր էջ' : lang === 'ru' ? 'На главную' : 'Back to store'}</span></Link>
      </header>

      <section className="account-shell">
        <div className="account-heading">
          <span className="account-kicker">ANVA LUXURY · PRIVATE AREA</span>
          <h1>{T('profile')}</h1>
          <p>{lang === 'hy' ? 'Կառավարեք Ձեր անձնական տվյալներն ու նախընտրությունները։' : lang === 'ru' ? 'Управляйте личными данными и предпочтениями.' : 'Manage your personal details and preferences.'}</p>
        </div>

        <div className="account-overview glass">
          <div className="account-avatar">{initials}</div>
          <div className="account-identity">
            <span>{lang === 'hy' ? 'Բարի վերադարձ' : lang === 'ru' ? 'С возвращением' : 'WELCOME BACK'}</span>
            <h2>{p.full_name.trim() || s.user.email?.split('@')[0] || 'ANVA Client'}</h2>
            <p>{s.user.email ?? s.user.phone}</p>
          </div>
          <div className="account-overview-divider" />
          <div className="account-stat"><strong>{favs.ids.size}</strong><span>{T('favs')}</span></div>
          <div className="account-stat"><strong>{rv.length}</strong><span>{T('my_reviews')}</span></div>
        </div>

        <div className="account-content-grid">
          <div className="glass box account-card account-profile-card">
            <div className="account-card-heading"><span className="account-card-icon">✧</span><div><span className="account-kicker">PERSONAL DETAILS</span><h3>{lang === 'hy' ? 'Անձնական տվյալներ' : lang === 'ru' ? 'Личные данные' : 'Personal details'}</h3></div></div>
            {loadingData ? <div className="account-skeleton" /> : <div className="account-form-grid">
              <label>{T('full_name')}<input autoComplete="name" value={p.full_name} onChange={e => setP({ ...p, full_name: e.target.value })} placeholder={lang === 'hy' ? 'Մուտքագրեք Ձեր անունը' : lang === 'ru' ? 'Введите ваше имя' : 'Enter your full name'} /></label>
              <label>{T('lang_pref')}<select value={p.preferred_language} onChange={e => setP({ ...p, preferred_language: e.target.value })}>{LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}</select></label>
              <label>{T('country_l')}<select value={p.country} onChange={e => setP({ ...p, country: e.target.value })}>{COUNTRIES.map(c => <option key={c} value={c}>{new Intl.DisplayNames([lang], { type: 'region' }).of(c)}</option>)}</select><small className="account-current-country">{countryName}</small></label>
            </div>}
            <div className="account-actions"><button className="btn-dark" onClick={save} disabled={saving || loadingData}>{saving ? '…' : T('save')}</button><span className="account-message" role="status">{msg}</span></div>
          </div>

          <aside className="account-side-column">
            <Link className="glass account-shortcut" to={`/${lang}/favorites`}><span className="account-shortcut-icon">♡</span><span><b>{T('favs')}</b><small>{lang === 'hy' ? 'Դիտել պահպանված ապրանքները' : lang === 'ru' ? 'Посмотреть сохранённые товары' : 'View your saved pieces'}</small></span><strong>↗</strong></Link>
            <div className="glass account-security-note"><span>◈</span><div><b>{lang === 'hy' ? 'Ձեր հաշիվը' : lang === 'ru' ? 'Ваш аккаунт' : 'Your account'}</b><p>{lang === 'hy' ? 'Ձեր տվյալները հասանելի են միայն Ձեր մուտք գործած հաշվից։' : lang === 'ru' ? 'Ваши данные доступны только после входа в аккаунт.' : 'Your profile details are available only when you are signed in.'}</p></div></div>
            <button className="account-logout" onClick={async () => { await supabase.auth.signOut(); nav(`/${lang}`) }}><span>↗</span>{T('logout')}</button>
          </aside>
        </div>

        <div className="glass box account-card account-reviews-card">
          <div className="account-card-heading"><span className="account-card-icon">✦</span><div><span className="account-kicker">YOUR VOICE</span><h3>{T('my_reviews')}</h3></div></div>
          {loadingData ? <div className="account-skeleton account-skeleton-short" /> : rv.length ? <div className="account-review-list">{rv.map((r, i) => {
            const productName = (r.products?.product_translations?.find(t => t.lang === lang) ?? r.products?.product_translations?.[0])?.name
            return <article className="account-review" key={`${i}-${r.body}`}><div className="account-review-top"><b>{productName || (lang === 'hy' ? 'Ապրանք' : lang === 'ru' ? 'Товар' : 'Product')}</b><span className={`account-review-status status-${r.status}`}>{T(`${r.status}_s`)}</span></div><div className="account-review-stars" aria-label={`${r.rating} / 5`}>{'★'.repeat(r.rating)}<span>{'★'.repeat(Math.max(0, 5 - r.rating))}</span></div><p>{r.body}</p></article>
          })}</div> : <div className="account-empty"><span>✧</span><p>{T('none_yet')}</p><small>{lang === 'hy' ? 'Ձեր կարծիքները կհայտնվեն այստեղ։' : lang === 'ru' ? 'Ваши отзывы появятся здесь.' : 'Your submitted reviews will appear here.'}</small></div>}
        </div>
        <footer className="account-footer">ANVA LUXURY <span>·</span> THE ART OF ELEGANCE</footer>
      </section>
    </div>
  )
}
