import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'
import { Lang, LANGS } from '../i18n'
import { a } from '../i18n/admin'
import { useSession } from '../lib/auth'
import { COUNTRIES } from '../lib/currency'
import { pick, t3, useContact } from '../lib/data'
import { useFavs } from '../lib/favorites'
import { setSeo } from '../lib/seo'
import { useSiteConfig } from '../lib/siteConfig'
import { supabase } from '../lib/supabase'

type Profile = { full_name: string; phone: string; preferred_language: string; country: string }
type Review = { rating: number; body: string | null; status: string; products?: { product_translations?: { lang: Lang; name: string }[] } | null }

export default function Account({ lang }: { lang: Lang }) {
  const s = useSession(); const nav = useNavigate(); const favs = useFavs(); const contact = useContact(); const { preview } = useSiteConfig()
  const T = (k: Parameters<typeof a>[1]) => a(lang, k)
  const [p, setP] = useState<Profile>({ full_name: '', phone: '', preferred_language: lang, country: 'AM' })
  const [rv, setRv] = useState<Review[]>([]); const [msg, setMsg] = useState(''); const [loadingData, setLoadingData] = useState(true); const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!s.user) { setLoadingData(false); return }
    const user = s.user; let active = true; setLoadingData(true)
    void Promise.all([
      supabase.from('profiles').select('full_name,phone,preferred_language,country').eq('id', user.id).maybeSingle(),
      supabase.from('reviews').select('rating,body,status,products(product_translations(lang,name))').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]).then(async ([pr, rr]) => {
      if (!active) return
      const meta = user.user_metadata as { phone?: string; full_name?: string }
      const row = pr.data
      const next: Profile = { full_name: row?.full_name ?? meta.full_name ?? '', phone: row?.phone ?? '', preferred_language: row?.preferred_language ?? lang, country: row?.country ?? 'AM' }
      // accounts created before the phone field existed (or before migration 005) get the phone from signup metadata, once
      if (!next.phone && meta.phone) { next.phone = meta.phone; void supabase.from('profiles').update({ phone: meta.phone }).eq('id', user.id) }
      setP(next); setRv((rr.data ?? []) as unknown as Review[]); setLoadingData(false)
    })
    return () => { active = false }
  }, [s.user?.id]) // eslint-disable-line

  useEffect(() => setSeo({ title: `ANVA — ${a(lang, 'profile')}`, lang, noindex: true }), [lang])
  const initials = useMemo(() => { const parts = p.full_name.trim().split(/\s+/).filter(Boolean); return (parts.length ? `${parts[0][0] ?? ''}${parts[1]?.[0] ?? ''}` : (s.user?.email?.[0] ?? 'A')).toUpperCase() }, [p.full_name, s.user?.email])

  if (s.loading) return <div className="adm-wait" aria-label="Loading">…</div>
  if (!s.user && !preview) return <Navigate to={`/${lang}/login`} replace />

  const save = async () => {
    if (!s.user) return
    const phone = p.phone.trim(); if (phone && !/^\+?[\d\s()-]{7,22}$/.test(phone)) return setMsg(t3(lang, 'Սխալ հեռախոսահամար։', 'Неверный номер телефона.', 'Invalid phone number.'))
    setSaving(true); setMsg('')
    const { error } = await supabase.from('profiles').update({ full_name: p.full_name.trim(), phone: phone || null, preferred_language: p.preferred_language, country: p.country }).eq('id', s.user.id)
    setSaving(false); if (error) return setMsg(`${T('err')}: ${error.message}`)
    localStorage.setItem('anva_country', p.country); localStorage.setItem('anva_country_manual', '1'); setMsg(T('saved'))
    if (p.preferred_language !== lang) nav(`/${p.preferred_language}/account`)
  }
  const regionName = (c: string) => new Intl.DisplayNames([lang], { type: 'region' }).of(c) ?? c

  return (
    <div className="site">
      <SiteHeader lang={lang} contact={contact} langPath="/account" />
      <main className="acct" data-edit="account">
        <div className="acct-head"><h1>{T('profile')}</h1><p>{t3(lang, 'Կառավարեք Ձեր անձնական տվյալներն ու նախընտրությունները։', 'Управляйте личными данными и предпочтениями.', 'Manage your personal details and preferences.')}</p></div>

        <div className="acct-card acct-overview">
          <div className="avatar" aria-hidden>{initials}</div>
          <div className="who"><small>{t3(lang, 'Բարի վերադարձ', 'С возвращением', 'Welcome back')}</small><h2>{p.full_name.trim() || s.user?.email?.split('@')[0] || '—'}</h2><p>{s.user?.email ?? s.user?.phone ?? ''}</p></div>
          <div className="stat"><strong>{favs.ids.size}</strong><span>{T('favs')}</span></div>
          <div className="stat"><strong>{rv.length}</strong><span>{T('my_reviews')}</span></div>
        </div>

        <div className="acct-grid">
          <section className="acct-card">
            <h3>{t3(lang, 'Անձնական տվյալներ', 'Личные данные', 'Personal details')}</h3>
            {loadingData ? <div className="skeleton" /> : <div className="form-grid">
              <label>{T('full_name')}<input autoComplete="name" value={p.full_name} onChange={e => setP({ ...p, full_name: e.target.value })} disabled={!s.user} /></label>
              <label>{t3(lang, 'Հեռախոսահամար', 'Номер телефона', 'Phone number')}<input type="tel" inputMode="tel" autoComplete="tel" value={p.phone} onChange={e => setP({ ...p, phone: e.target.value })} disabled={!s.user} /></label>
              <label>{T('lang_pref')}<select value={p.preferred_language} onChange={e => setP({ ...p, preferred_language: e.target.value })} disabled={!s.user}>{LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}</select></label>
              <label>{T('country_l')}<select value={p.country} onChange={e => setP({ ...p, country: e.target.value })} disabled={!s.user}>{COUNTRIES.map(c => <option key={c} value={c}>{regionName(c)}</option>)}</select></label>
            </div>}
            <div className="acts"><button className="btn-dark" onClick={save} disabled={saving || loadingData || !s.user}>{saving ? '…' : T('save')}</button><span className="account-message" role="status">{msg}</span></div>
          </section>
          <aside className="acct-side">
            <Link className="acct-card shortcut" to={`/${lang}/favorites`}><span><b>{T('favs')}</b><small>{t3(lang, 'Դիտել պահպանված ապրանքները', 'Посмотреть сохранённые товары', 'View your saved pieces')}</small></span><i aria-hidden>→</i></Link>
            <Link className="acct-card shortcut" to={`/${lang}`}><span><b>{t3(lang, 'Գլխավոր էջ', 'На главную', 'Back to store')}</b><small>{t3(lang, 'Վերադառնալ խանութ', 'Вернуться в магазин', 'Continue browsing')}</small></span><i aria-hidden>→</i></Link>
            <button className="btn-light logout" disabled={!s.user} onClick={async () => { await supabase.auth.signOut(); nav(`/${lang}`) }}>{T('logout')}</button>
          </aside>
        </div>

        <section className="acct-card">
          <h3>{T('my_reviews')}</h3>
          {loadingData ? <div className="skeleton short" /> : rv.length ? <div className="rv-list">{rv.map((r, i) => {
            const name = pick(r.products?.product_translations, lang)?.name
            return <article className="rv-item" key={`${i}-${r.body}`}><div className="rv-top"><b>{name || t3(lang, 'Ապրանք', 'Товар', 'Product')}</b><span className={`status s-${r.status}`}>{T(`${r.status}_s` as 'pending_s')}</span></div>
              <div className="stars" aria-label={`${r.rating} / 5`}>{'★'.repeat(r.rating)}<span>{'★'.repeat(Math.max(0, 5 - r.rating))}</span></div>{r.body && <p>{r.body}</p>}</article>
          })}</div> : <div className="empty"><p style={{ margin: 0 }}>{T('none_yet')}</p><small>{t3(lang, 'Ձեր կարծիքները կհայտնվեն այստեղ։', 'Ваши отзывы появятся здесь.', 'Your submitted reviews will appear here.')}</small></div>}
        </section>
      </main>
      <SiteFooter lang={lang} contact={contact} />
    </div>
  )
}
