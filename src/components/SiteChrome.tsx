import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../assets'
import { LANGS, Lang } from '../i18n'
import { h, HKey } from '../i18n/home'
import { Contact, tel } from '../lib/data'
import { supabase } from '../lib/supabase'
import { track } from '../lib/track'
import {
  Close,
  Facebook,
  Gem,
  Grid,
  Heart,
  Home,
  Mail,
  Menu,
  Phone,
  User,
  Instagram,
  TikTok
} from './Icons'
import MobileDock from './MobileDock'

/** Same header on every storefront page. On the homepage the menu scrolls; elsewhere it links back to the homepage sections. */
export function SiteHeader({
  lang,
  contact,
  home = false,
  langPath = ''
}: {
  lang: Lang
  contact: Contact
  home?: boolean
  langPath?: string
}) {
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const T = (k: HKey) => h(lang, k)

  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    addEventListener('keydown', f)
    return () => removeEventListener('keydown', f)
  }, [])

  const link = (hash: string, label: string, on = false) => home
    ? <a className={on ? 'on' : ''} href={`#${hash}`}>{label}</a>
    : <Link to={{ pathname: `/${lang}`, hash: `#${hash}` }}>{label}</Link>

  const dock = [
    { hash: 'top', label: T('home'), icon: <Home size={22} /> },
    { hash: 'collections', label: T('collections'), icon: <Grid size={22} /> },
    { hash: 'featured', label: T('shop'), icon: <Gem size={22} /> },
    { hash: 'footer', label: T('contact'), icon: <Phone size={22} /> }
  ]

  return (
    <>
      <header className="nav" data-edit="header">
        <div className="nav-in">
          <button
            className="ic-btn burger"
            aria-label={open ? 'Close menu' : 'Menu'}
            aria-expanded={open}
            onClick={() => setOpen(o => !o)}
          >
            {open ? <Close /> : <Menu />}
          </button>

          <Link className="brand" to={`/${lang}`} aria-label="ANVA LUXURY">
            <img src={assets.branding.logo} alt="ANVA LUXURY" />
          </Link>

          <nav
            className={`menu${open ? ' open' : ''}`}
            onClick={e => (e.target as HTMLElement).closest('a') && setOpen(false)}
          >
            <span className="menu-pill" aria-hidden />
            {link('top', T('home'), home)}
            {link('collections', T('collections'))}
            {link('featured', T('shop'))}
            {link('footer', T('contact'))}
          </nav>

          <div className="nav-right">
            {contact.phone && (
              <a className="nav-phone" href={`tel:${tel(contact.phone)}`}>
                {contact.phone}
              </a>
            )}

            <span className="lg-btns">
              {LANGS.map(l => (
                <button
                  key={l}
                  className={l === lang ? 'on' : ''}
                  onClick={() => nav(`/${l}${langPath}`)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </span>

            <select
              className="lg-sel"
              value={lang}
              aria-label="Language"
              onChange={e => nav(`/${e.target.value}${langPath}`)}
            >
              {LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>

            <Link className="ic-btn" aria-label={T('favorites')} to={`/${lang}/favorites`}>
              <Heart size={21} />
            </Link>

            <Link className="ic-btn" aria-label={T('account')} to={`/${lang}/account`}>
              <User size={21} />
            </Link>
          </div>
        </div>
      </header>

      <MobileDock lang={lang} home={home} items={dock} />
    </>
  )
}

export function SiteFooter({ lang, contact }: { lang: Lang; contact: Contact }) {
  const T = (k: HKey) => h(lang, k)
  const [mail, setMail] = useState('')
  const [sub, setSub] = useState<HKey | null>(null)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)

  async function subscribe(e: FormEvent) {
    e.preventDefault()
    setBusy(true)

    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email: mail.trim() })

    setBusy(false)

    if (!error) {
      setOk(true)
      setTimeout(() => setOk(false), 2600)
    }

    setSub(!error ? 'sub_ok' : error.code === '23505' ? 'sub_dup' : 'sub_err')

    if (!error) {
      setMail('')
      track('newsletter_subscribe', { lang })
    }
  }

  const to = (hash: string) => ({ pathname: `/${lang}`, hash })

  const socialLinks = [
    { key: 'instagram', icon: <Instagram size={20} /> },
    { key: 'tiktok', icon: <TikTok size={20} /> },
    { key: 'facebook', icon: <Facebook size={20} /> },
    { key: 'youtube', icon: null },
    { key: 'pinterest', icon: null }
  ] as const

  return (
    <footer id="footer" className="foot" data-edit="footer">
      <div className="foot-in">
        <div className="foot-brand">
          <img src={assets.branding.logo} alt="ANVA LUXURY" />
        </div>

        <div>
          <h4>{T('quick')}</h4>
          <Link to={to('#featured')}>{T('shop')}</Link>
          <Link to={to('#collections')}>{T('collections')}</Link>
        </div>

        <div>
          <h4>{T('follow')}</h4>

          {contact.phone && (
            <a className="cline" href={`tel:${tel(contact.phone)}`}>
              <Phone size={16} /> {contact.phone}
            </a>
          )}

          {contact.email && (
            <a className="cline" href={`mailto:${contact.email}`}>
              <Mail size={16} /> {contact.email}
            </a>
          )}

          <p className="soc" style={{ margin: 0 }}>
            {socialLinks
              .filter(item => contact[item.key])
              .map(item => (
                <a
                  key={item.key}
                  href={contact[item.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.key}
                  title={item.key}
                >
                  {item.icon ?? item.key}
                </a>
              ))}
          </p>
        </div>

        <form onSubmit={subscribe}>
          <h4>{T('sub')}</h4>

          <input
            type="email"
            required
            value={mail}
            onChange={e => setMail(e.target.value)}
            placeholder={T('email')}
            aria-label={T('email')}
          />

          <button
            className={`btn-dark mo-load${busy ? ' is-busy' : ''}${ok ? ' is-ok' : ''}`}
            disabled={busy}
            aria-busy={busy}
          >
            <span className="mo-lbl">{T('sub')}</span>
            <span className="mo-spin" aria-hidden />
            <svg className="mo-check" viewBox="0 0 24 24" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </button>

          {sub && (
            <p role="status" style={{ margin: 0, fontSize: 13 }}>
              {T(sub)}
            </p>
          )}
        </form>
      </div>

      <div className="foot-bottom">
        <span>© {new Date().getFullYear()} ANVA LUXURY. {T('rights')}</span>
      </div>
    </footer>
  )
}