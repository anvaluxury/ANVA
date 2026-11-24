import { FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { assets } from '../../assets'
import { Lang } from '../../i18n'
import { useAdminSession } from '../../lib/auth'
import {
  adminSupabase,
  supabaseConfigured
} from '../../lib/supabase'
import { setSeo } from '../../lib/seo'

export default function AdminLogin({ lang }: { lang: Lang }) {
  const nav = useNavigate()
  const session = useAdminSession()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setSeo({
      title: 'ANVA — Admin Login',
      lang,
      noindex: true
    })
  }, [lang])

  useEffect(() => {
    if (
      !session.loading &&
      session.user &&
      session.isAdmin
    ) {
      nav(`/${lang}/admin`, { replace: true })
    }
  }, [
    session.loading,
    session.user,
    session.isAdmin,
    lang,
    nav
  ])

  if (session.loading) {
    return <div className="adm-wait">…</div>
  }

  if (session.user && session.isAdmin) {
    return <Navigate to={`/${lang}/admin`} replace />
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')

    if (!supabaseConfigured) {
      setMessage('Supabase-ը կարգավորված չէ։ Ստուգիր .env.local ֆայլը։')
      return
    }

    if (!email.trim() || !password) {
      setMessage('Լրացրու էլեկտրոնային հասցեն և գաղտնաբառը։')
      return
    }

    setBusy(true)

    try {
      const { data, error } =
        await adminSupabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })

      if (error || !data.user) {
        setMessage('Էլ․ հասցեն կամ գաղտնաբառը սխալ է։')
        return
      }

      const { data: roles, error: roleError } =
        await adminSupabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)

      if (
        roleError ||
        !roles ||
        roles.length === 0
      ) {
        await adminSupabase.auth.signOut()

        setMessage(
          'Այս հաշիվը չունի Admin մուտքի թույլտվություն։'
        )

        return
      }

      nav(`/${lang}/admin`, { replace: true })
    } catch {
      setMessage('Կապի սխալ։ Փորձիր կրկին։')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main
      className="auth"
      style={{
        backgroundImage: `url(${assets.backgrounds.silk})`
      }}
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
        className="auth-logo"
        src={assets.branding.logo}
        alt="ANVA LUXURY"
      />

      <form
        className="glass auth-panel"
        onSubmit={submit}
        noValidate
      >
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              letterSpacing: '.22em',
              fontSize: 12,
              margin: '0 0 8px'
            }}
          >
            SECURE ACCESS
          </p>

          <h1
            style={{
              fontFamily: 'var(--serif)',
              fontWeight: 500,
              margin: 0
            }}
          >
            Admin Login
          </h1>

          <p style={{ opacity: .75, margin: '8px 0 0' }}>
            Մուտք միայն լիազորված ադմինիստրատորների համար
          </p>
        </div>

        <label className="field">
          <span className="ic" aria-hidden>
            ✉
          </span>

          <input
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="Էլեկտրոնային հասցե"
            autoComplete="username"
            inputMode="email"
            required
          />
        </label>

        <label className="field">
          <span className="ic" aria-hidden>
            🔒
          </span>

          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={event => setPassword(event.target.value)}
            placeholder="Գաղտնաբառ"
            autoComplete="current-password"
            required
          />

          <button
            type="button"
            className="eye"
            onClick={() =>
              setShowPassword(value => !value)
            }
            aria-label={
              showPassword
                ? 'Թաքցնել գաղտնաբառը'
                : 'Ցույց տալ գաղտնաբառը'
            }
          >
            {showPassword ? '◉' : '◎'}
          </button>
        </label>

        {message && (
          <p role="alert" className="msg error">
            {message}
          </p>
        )}

        <button
          className="btn-dark"
          type="submit"
          disabled={busy}
        >
          {busy ? 'Սպասիր…' : 'Մուտք գործել  →'}
        </button>

        <Link
          to={`/${lang}`}
          style={{
            textAlign: 'center',
            color: 'inherit',
            fontSize: 14
          }}
        >
          Վերադառնալ ANVA կայք
        </Link>
      </form>
    </main>
  )
}