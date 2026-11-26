import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../assets'
import { Eye, EyeOff, Lock, Mail, Phone, User } from '../components/Icons'
import { LANGS, Lang, Key, t } from '../i18n'
import { storageUrl } from '../lib/data'
import { setSeo } from '../lib/seo'
import { useSiteConfig } from '../lib/siteConfig'
import { setRemember, supabase, supabaseConfigured } from '../lib/supabase'

type Mode = 'login' | 'register'
type Msg = { kind: 'error' | 'ok'; key: Key } | null
type Errs = Partial<Record<'first' | 'last' | 'phone' | 'email' | 'pw', Key>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phoneOk = (v: string) => /^\+?[\d\s()-]{7,22}$/.test(v) && v.replace(/\D/g, '').length >= 7 && v.replace(/\D/g, '').length <= 15

export default function AuthPage({ lang }: { lang: Lang }) {
  const nav = useNavigate(); const { cfg, preview } = useSiteConfig(); const T = (k: Key) => t(lang, k)
  const formRef = useRef<HTMLFormElement>(null)
  const [mode, setMode] = useState<Mode>('login')
  const [f, setF] = useState({ first: '', last: '', phone: '', email: '', pw: '' })
  const [show, setShow] = useState(false); const [remember, setRem] = useState(true); const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null); const [errs, setErrs] = useState<Errs>({}); const [done, setDone] = useState<null | 'in' | 'mail'>(null)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF(s => ({ ...s, [k]: e.target.value })); if (errs[k]) setErrs(x => ({ ...x, [k]: undefined })) }

  useEffect(() => { setSeo({ title: `ANVA — ${t(lang, 'login')}`, lang, noindex: true }) }, [lang])
  useEffect(() => { if (done !== 'in') return; const id = setTimeout(() => nav(`/${lang}`), 1400); return () => clearTimeout(id) }, [done, lang, nav])

  // Enter jumps to the next field; Enter on the last field submits the form
  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    e.preventDefault()
    const form = e.currentTarget.form; if (!form) return
    const inputs = [...form.querySelectorAll<HTMLInputElement>('input:not([type=checkbox]):not([type=hidden]):not([disabled])')]
    const i = inputs.indexOf(e.currentTarget)
    if (i >= 0 && i < inputs.length - 1) inputs[i + 1].focus(); else form.requestSubmit()
  }

  function validate(): Errs {
    const x: Errs = {}
    if (mode === 'register') { if (!f.first.trim()) x.first = 'err_first'; if (!f.last.trim()) x.last = 'err_last'; if (!phoneOk(f.phone.trim())) x.phone = 'err_phone' }
    if (!f.email.trim()) x.email = 'err_required'; else if (!EMAIL.test(f.email.trim())) x.email = 'err_email'
    if (!f.pw) x.pw = 'err_required'; else if (mode === 'register' && f.pw.length < 8) x.pw = 'err_pw_short'
    return x
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null)
    if (!supabaseConfigured) return setMsg({ kind: 'error', key: 'err_config' })
    const x = validate(); setErrs(x)
    if (Object.keys(x).length) { formRef.current?.querySelector<HTMLInputElement>('[aria-invalid=true]')?.focus(); return }
    setBusy(true)
    try {
      const email = f.email.trim()
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password: f.pw, options: { data: {
          full_name: `${f.first.trim()} ${f.last.trim()}`, first_name: f.first.trim(), last_name: f.last.trim(), phone: f.phone.trim(), preferred_language: lang } } })
        if (error) return setMsg({ kind: 'error', key: /registered|exists/i.test(error.message) ? 'err_exists' : /password/i.test(error.message) ? 'err_pw_short' : 'err_signup' })
        // Supabase answers with an empty identities list for an already-registered email (when confirmation is on)
        if (!data.session && data.user && data.user.identities?.length === 0) return setMsg({ kind: 'error', key: 'err_exists' })
        setDone(data.session ? 'in' : 'mail'); return
      }
      setRemember(remember)
      const { error } = await supabase.auth.signInWithPassword({ email, password: f.pw })
      if (error) return setMsg({ kind: 'error', key: 'err_invalid' })
      setDone('in')
    } catch { setMsg({ kind: 'error', key: 'err_network' }) } finally { setBusy(false) }
  }

  const guard = async (fn: () => Promise<void>) => { if (!supabaseConfigured) return setMsg({ kind: 'error', key: 'err_config' }); setBusy(true); setMsg(null); try { await fn() } catch { setMsg({ kind: 'error', key: 'err_network' }) } finally { setBusy(false) } }
  const forgot = () => void guard(async () => {
    const email = f.email.trim(); if (!email) return setMsg({ kind: 'error', key: 'reset_need_email' }); if (!EMAIL.test(email)) return setMsg({ kind: 'error', key: 'err_email' })
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/${lang}/login` })
    setMsg(error ? { kind: 'error', key: 'err_network' } : { kind: 'ok', key: 'reset_sent' })
  })
  const google = () => void guard(async () => { const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/${lang}` } }); if (error) setMsg({ kind: 'error', key: 'err_google' }) })

  const art = storageUrl('homepage-images', cfg.media.auth)
  const field = (k: keyof typeof f, label: Key, icon: JSX.Element, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="fld"><label className={`field${errs[k] ? ' bad' : ''}`}><span className="ic">{icon}</span>
      <input value={f[k]} onChange={set(k)} onKeyDown={onEnter} placeholder={T(label)} aria-label={T(label)} aria-invalid={!!errs[k]} aria-describedby={errs[k] ? `e-${k}` : undefined} disabled={busy} {...props} />
      {k === 'pw' && <button type="button" className="eye" aria-label={T(show ? 'hide' : 'show')} onClick={() => setShow(s => !s)}>{show ? <Eye size={20} /> : <EyeOff size={20} />}</button>}</label>
      {errs[k] && <small id={`e-${k}`} className="err" role="alert">{T(errs[k]!)}</small>}</div>)

  return (
    <main className="auth" data-edit="auth">
      <div className="auth-art" aria-hidden>
        {art ? <img src={art} alt="" /> : <><img className="mono" src={assets.branding.monogram} alt="" /><img className="ring" src={assets.jewelry.ringPave} alt="" /></>}
      </div>
      <div className="auth-side">
        <div className="auth-top">
          <Link className="auth-home" to={`/${lang}`}>← {T('back_home')}</Link>
          <div className="auth-lang" role="group" aria-label={T('lang')}>{LANGS.map(l => <button key={l} type="button" className={l === lang ? 'on' : ''} onClick={() => nav(`/${l}/login`)}>{l.toUpperCase()}</button>)}</div>
        </div>
        <div className="auth-panel">
          <Link to={`/${lang}`} aria-label="ANVA LUXURY"><img className="auth-logo" src={assets.branding.logo} alt="ANVA LUXURY" /></Link>
          {done && !preview ? (
            <div className="auth-done" role="status">
              <h1>{done === 'in' ? T('ok_login') : T('check_mail')}</h1>
              {done === 'mail' && <p>{T('ok_register')}</p>}
              <Link className="btn-dark" to={`/${lang}`}>{T('continue_store')}</Link>
              {done === 'mail' && <button className="link" onClick={() => { setDone(null); setMode('login') }}>{T('login')}</button>}
            </div>
          ) : (
            <form ref={formRef} onSubmit={submit} noValidate>
              <div className="tabs" role="tablist">{(['login', 'register'] as Mode[]).map(m => <button type="button" role="tab" aria-selected={mode === m} key={m} className={mode === m ? 'on' : ''} onClick={() => { setMode(m); setMsg(null); setErrs({}) }}>{T(m)}</button>)}</div>
              <p className="auth-sub">{T(mode === 'login' ? 'login_sub' : 'register_sub')}</p>
              {mode === 'register' && <div className="two-f">
                {field('first', 'first_name', <User size={19} />, { autoComplete: 'given-name', type: 'text', autoCapitalize: 'words' })}
                {field('last', 'last_name', <User size={19} />, { autoComplete: 'family-name', type: 'text', autoCapitalize: 'words' })}</div>}
              {mode === 'register' && field('phone', 'phone', <Phone size={19} />, { autoComplete: 'tel', type: 'tel', inputMode: 'tel' })}
              {field('email', 'email_phone', <Mail size={19} />, { autoComplete: 'email', type: 'email', inputMode: 'email', autoCapitalize: 'none', spellCheck: false })}
              {field('pw', 'password', <Lock size={19} />, { type: show ? 'text' : 'password', autoComplete: mode === 'login' ? 'current-password' : 'new-password' })}
              {mode === 'register' && <small className="hint">{T('pw_hint')}</small>}
              {mode === 'login' && <div className="row"><label className="check"><input type="checkbox" checked={remember} onChange={e => setRem(e.target.checked)} /><i />{T('remember')}</label><button type="button" className="link" onClick={forgot}>{T('forgot')}</button></div>}
              {msg && <p role="alert" className={`msg ${msg.kind}`}>{T(msg.key)}</p>}
              <button className="btn-dark wide-btn" disabled={busy}>{busy && <span className="spin-dot" aria-hidden />}{busy ? T('loading') : mode === 'login' ? T('login') : T('create')}</button>
              <div className="or"><span>{T('or')}</span></div>
              <button type="button" className="btn-light wide-btn" onClick={google} disabled={busy}>
                <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" /><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
                {T('google')}</button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
