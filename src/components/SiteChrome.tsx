import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../assets'
import { LANGS, Lang } from '../i18n'
import { h, HKey } from '../i18n/home'
import { Contact, tel } from '../lib/data'
import { supabase } from '../lib/supabase'
import { track } from '../lib/track'
import { Close, Heart, Mail, Menu, Phone, User, Instagram, TikTok } from './Icons'

/** Same header on every storefront page. On the homepage the menu scrolls; elsewhere it links back to the homepage sections. */
export function SiteHeader({ lang, contact, home = false, langPath = '' }: { lang: Lang; contact: Contact; home?: boolean; langPath?: string }) {
  const nav = useNavigate(); const [open, setOpen] = useState(false); const T = (k: HKey) => h(lang, k)
  useEffect(() => { const f = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false); addEventListener('keydown', f); return () => removeEventListener('keydown', f) }, [])
  const link = (hash: string, label: string, on = false) => home
    ? <a className={on ? 'on' : ''} href={`#${hash}`}>{label}</a>
    : <Link to={{ pathname: `/${lang}`, hash: `#${hash}` }}>{label}</Link>
  return (
    <header className="nav" data-edit="header">
      <div className="nav-in">
        <button className="ic-btn burger" aria-label={open ? 'Close menu' : 'Menu'} aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? <Close /> : <Menu />}</button>
        <Link className="brand" to={`/${lang}`} aria-label="ANVA LUXURY"><img src={assets.branding.logo} alt="ANVA LUXURY" /></Link>
        <nav className={`menu${open ? ' open' : ''}`} onClick={e => (e.target as HTMLElement).closest('a') && setOpen(false)}>
          {link('top', T('home'), home)}{link('collections', T('collections'))}{link('featured', T('shop'))}{link('about', T('about'))}{link('footer', T('contact'))}
        </nav>
        <div className="nav-right">
          {contact.phone && <a className="nav-phone" href={`tel:${tel(contact.phone)}`}>{contact.phone}</a>}
          <span className="lg-btns">{LANGS.map(l => <button key={l} className={l === lang ? 'on' : ''} onClick={() => nav(`/${l}${langPath}`)}>{l.toUpperCase()}</button>)}</span>
          <select className="lg-sel" value={lang} aria-label="Language" onChange={e => nav(`/${e.target.value}${langPath}`)}>{LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}</select>
          <Link className="ic-btn" aria-label={T('favorites')} to={`/${lang}/favorites`}><Heart size={21} /></Link>
          <Link className="ic-btn" aria-label={T('account')} to={`/${lang}/account`}><User size={21} /></Link>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter({ lang, contact }: { lang: Lang; contact: Contact }) {
  const T = (k: HKey) => h(lang, k); const [mail, setMail] = useState(''); const [sub, setSub] = useState<HKey | null>(null)
  async function subscribe(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('newsletter_subscribers').insert({ email: mail.trim() })
    setSub(!error ? 'sub_ok' : error.code === '23505' ? 'sub_dup' : 'sub_err'); if (!error) { setMail(''); track('newsletter_subscribe', { lang }) }
  }
  const to = (hash: string) => ({ pathname: `/${lang}`, hash })
  return (
    <footer id="footer" className="foot" data-edit="footer">
      <div className="foot-in">
        <div className="foot-brand"><img src={assets.branding.logo} alt="ANVA LUXURY" /></div>
        <div><h4>{T('quick')}</h4><Link to={to('#featured')}>{T('shop')}</Link><Link to={to('#collections')}>{T('collections')}</Link><Link to={to('#about')}>{T('about')}</Link></div>
        <div><h4>{T('follow')}</h4>
          {contact.phone && <a className="cline" href={`tel:${tel(contact.phone)}`}><Phone size={16} /> {contact.phone}</a>}
          {contact.email && <a className="cline" href={`mailto:${contact.email}`}><Mail size={16} /> {contact.email}</a>}
          <p className="soc" style={{ margin: 0 }}>{(['instagram', 'tiktok', 'facebook', 'youtube', 'pinterest'] as const).filter(k => contact[k]).map(k => <a key={k} href={contact[k]} target="_blank" rel="noopener noreferrer" aria-label={k}>{k === 'instagram' ? <Instagram size={20} /> : k === 'tiktok' ? <TikTok size={20} /> : k}</a>)}</p></div>
        <form onSubmit={subscribe}><h4>{T('sub')}</h4><input type="email" required value={mail} onChange={e => setMail(e.target.value)} placeholder={T('email')} aria-label={T('email')} /><button className="btn-dark">{T('sub')}</button>{sub && <p role="status" style={{ margin: 0, fontSize: 13 }}>{T(sub)}</p>}</form>
      </div>
      <div className="foot-bottom"><span>© {new Date().getFullYear()} ANVA LUXURY. {T('rights')}</span></div>
    </footer>
  )
}
