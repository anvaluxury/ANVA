import { FormEvent, useEffect, useState } from 'react'
import { setSeo } from '../lib/seo'
import { Eye, EyeOff, Lock, Mail, User } from '../components/Icons'
import { useNavigate } from 'react-router-dom'
import { assets } from '../assets'
import { LANGS, Lang, Key, t } from '../i18n'
import { setRemember, supabase, supabaseConfigured } from '../lib/supabase'

type Mode = 'login' | 'register'
type Msg = { kind: 'error' | 'ok'; key: Key } | null

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function AuthPage({ lang }: { lang: Lang }) {
  const nav = useNavigate()

  const [mode, setMode] = useState<Mode>('login')
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [name, setName] = useState('')

  const [show, setShow] = useState(false)
  const [remember, setRem] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  const T = (k: Key) => t(lang, k)

  useEffect(() => {
    setSeo({
      title: `ANVA — ${t(lang, 'login')}`,
      lang,
      noindex: true
    })
  }, [lang])

  const fail = (key: Key) => {
    setMsg({ kind: 'error', key })
  }

  async function guard<R>(fn: () => Promise<R>) {
    if (!supabaseConfigured) {
      return fail('err_config')
    }

    setBusy(true)
    setMsg(null)

    try {
      await fn()
    } catch {
      fail('err_network')
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()

    void guard(async () => {
      const email = id.trim()

      if (!email || !pw || (mode === 'register' && !name.trim())) {
        return fail('err_required')
      }

      if (!EMAIL.test(email)) {
        return fail('err_email')
      }

      if (mode === 'register') {
        if (pw.length < 8) {
          return fail('err_pw_short')
        }

        if (pw !== pw2) {
          return fail('err_pw_match')
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password: pw,
          options: {
            data: {
              full_name: name.trim(),
              preferred_language: lang
            }
          }
        })

        if (error) {
          return fail('err_invalid')
        }

        if (data.session) {
          nav(`/${lang}`)
        } else {
          setMsg({ kind: 'ok', key: 'ok_register' })
        }

        return
      }

      setRemember(remember)

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pw
      })

      if (error) {
        return fail('err_invalid')
      }

      nav(`/${lang}`)
    })
  }

  const forgot = () => {
    void guard(async () => {
      const email = id.trim()

      if (!email) {
        return fail('reset_need_email')
      }

      if (!EMAIL.test(email)) {
        return fail('err_email')
      }

      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${location.origin}/${lang}/login`
        }
      )

      if (error) {
        fail('err_network')
      } else {
        setMsg({ kind: 'ok', key: 'reset_sent' })
      }
    })
  }

  const google = () => {
    void guard(async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${location.origin}/${lang}`
        }
      })

      if (error) {
        fail('err_google')
      }
    })
  }

  return (
    <main
      className="auth"
      style={{ backgroundImage: `url(${assets.backgrounds.silk})` }}
    >
      <img
        className="auth-ribbon l"
        src={assets.chrome.ribbonA}
        alt=""
        aria-hidden
      />

      <img
        className="auth-ribbon r"
        src={assets.chrome.ribbonInfinity}
        alt=""
        aria-hidden
      />

      <img
        className="auth-ring"
        src={assets.jewelry.ringPave}
        alt=""
        aria-hidden
      />

      <img
        className="auth-gem g1"
        src={assets.diamonds.faceted}
        alt=""
        aria-hidden
      />

      <img
        className="auth-gem g2"
        src={assets.diamonds.facetedAlt}
        alt=""
        aria-hidden
      />

      <img
        className="auth-gem g3"
        src={assets.diamonds.photoreal}
        alt=""
        aria-hidden
      />

      <div className="auth-lang" role="group" aria-label={T('lang')}>
        {LANGS.map(l => (
          <button
            key={l}
            className={l === lang ? 'on' : ''}
            onClick={() => nav(`/${l}/login`)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <img
        className="auth-logo"
        src={assets.branding.logo}
        alt="ANVA LUXURY"
      />

      <form
        className="glass auth-panel"
        onSubmit={submit}
        noValidate
      >
        <div className="tabs" role="tablist">
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              type="button"
              role="tab"
              aria-selected={mode === m}
              key={m}
              className={mode === m ? 'on' : ''}
              onClick={() => {
                setMode(m)
                setMsg(null)
              }}
            >
              {T(m)}
            </button>
          ))}
        </div>

        {mode === 'register' && (
          <label className="field">
            <span className="ic">
              <User />
            </span>

            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={T('full_name')}
              autoComplete="name"
            />
          </label>
        )}

        <label className="field">
          <span className="ic">
            <Mail />
          </span>

          <input
            value={id}
            onChange={e => setId(e.target.value)}
            placeholder={T('email_phone')}
            autoComplete="email"
            type="email"
            inputMode="email"
            required
          />
        </label>

        <label className="field">
          <span className="ic">
            <Lock />
          </span>

          <input
            value={pw}
            onChange={e => setPw(e.target.value)}
            type={show ? 'text' : 'password'}
            placeholder={T('password')}
            autoComplete={
              mode === 'login'
                ? 'current-password'
                : 'new-password'
            }
            required
          />

          <button
            type="button"
            className="eye"
            aria-label={T(show ? 'hide' : 'show')}
            onClick={() => setShow(s => !s)}
          >
            {show ? <Eye /> : <EyeOff />}
          </button>
        </label>

        {mode === 'register' && (
          <label className="field">
            <span className="ic">
              <Lock />
            </span>

            <input
              value={pw2}
              onChange={e => setPw2(e.target.value)}
              type={show ? 'text' : 'password'}
              placeholder={T('confirm')}
              autoComplete="new-password"
              required
            />
          </label>
        )}

        {mode === 'login' && (
          <div className="row">
            <label className="check">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRem(e.target.checked)}
              />

              <i />
              {T('remember')}
            </label>

            <button
              type="button"
              className="link"
              onClick={forgot}
            >
              {T('forgot')}
            </button>
          </div>
        )}

        {msg && (
          <p
            role="alert"
            className={`msg ${msg.kind}`}
          >
            {T(msg.key)}
          </p>
        )}

        <button
          className="btn-dark"
          disabled={busy}
        >
          {busy
            ? T('loading')
            : mode === 'login'
              ? `${T('login')}  →`
              : `${T('create')}  →`}
        </button>

        <div className="or">
          <span>{T('or')}</span>
        </div>

        <button
          type="button"
          className="btn-google"
          onClick={google}
          disabled={busy}
          aria-label={T('google')}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 48 48"
            aria-hidden
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"
            />

            <path
              fill="#4285F4"
              d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"
            />

            <path
              fill="#FBBC05"
              d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z"
            />

            <path
              fill="#34A853"
              d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.400 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z"
            />
          </svg>
        </button>
      </form>
    </main>
  )
}