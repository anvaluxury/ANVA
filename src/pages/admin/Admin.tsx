import { useEffect, useState } from 'react'
import {
  Link,
  Navigate,
  useNavigate,
  useParams
} from 'react-router-dom'

import { assets } from '../../assets'
import { Lang } from '../../i18n'
import { a, AKey } from '../../i18n/admin'
import { useAdminSession } from '../../lib/auth'
import { adminSupabase } from '../../lib/supabase'
import { setSeo } from '../../lib/seo'

import {
  Bell,
  Brush,
  Chart,
  Crown,
  Gear,
  Gem,
  Grid,
  Home,
  Layout,
  Logout,
  Percent,
  Star
} from '../../components/Icons'

import Dashboard from './Dashboard'
import Products from './Products'
import Categories from './Categories'
import Settings from './Settings'
import Admins from './Admins'
import MfaGate from './MfaGate'
import Notifications from './Notifications'
import Analytics from './Analytics'
import Reviews from './Reviews'
import Promotions from './Promotions'
import HomepageEditor from './HomepageEditor'
import SiteEditor from './SiteEditor'

const TABS = [
  ['dashboard', Home],
  ['products', Gem],
  ['categories', Grid],
  ['promos', Percent],
  ['reviews', Star],
  ['analytics', Chart],
  ['editor', Brush],
  ['homepage', Layout],
  ['notifs', Bell],
  ['admins', Crown],
  ['settings', Gear]
] as const

export type Ctx = {
  lang: Lang
  T: (key: AKey) => string
  has: (...roles: any[]) => boolean
}

export default function Admin({ lang }: { lang: Lang }) {
  const { tab = 'dashboard' } = useParams()
  const nav = useNavigate()
  const s = useAdminSession()

  const T = (key: AKey) => a(lang, key)

  const [mfa, setMfa] = useState<'checking' | 'ok' | 'need'>('checking')

  useEffect(() => {
    setSeo({
      title: 'ANVA Admin',
      lang,
      noindex: true
    })
  }, [lang])

  useEffect(() => {
    let active = true

    if (!s.user) {
      setMfa('checking')
      return
    }

    setMfa('checking')

    adminSupabase.auth.mfa
      .getAuthenticatorAssuranceLevel()
      .then(({ data }) => {
        if (!active) return

        setMfa(
          data?.nextLevel === 'aal2' &&
          data.currentLevel !== 'aal2'
            ? 'need'
            : 'ok'
        )
      })
      .catch(() => {
        if (active) setMfa('ok')
      })

    return () => {
      active = false
    }
  }, [s.user?.id])

  useEffect(() => {
    if (
      mfa === 'ok' &&
      s.isAdmin &&
      !sessionStorage.getItem('anva_admin_login_logged')
    ) {
      sessionStorage.setItem('anva_admin_login_logged', '1')

      void adminSupabase.functions.invoke('admin-users', {
        body: { action: 'log_login' }
      })
    }
  }, [mfa, s.isAdmin])

  if (s.loading) {
    return <div className="adm-wait">…</div>
  }

  if (!s.user) {
    return (
      <Navigate
        to={`/${lang}/admin/login`}
        replace
      />
    )
  }

  if (mfa === 'checking') {
    return <div className="adm-wait">…</div>
  }

  if (mfa === 'need') {
    return <MfaGate T={T} />
  }

  if (!s.isAdmin) {
    return (
      <div className="adm-wait">
        <p>{T('denied')}</p>

        <Link to={`/${lang}`}>
          {T('site')}
        </Link>

        <button
          className="btn-dark"
          onClick={async () => {
            await adminSupabase.auth.signOut()
            nav(`/${lang}/admin/login`, { replace: true })
          }}
        >
          Դուրս գալ
        </button>
      </div>
    )
  }

  const ctx: Ctx = {
    lang,
    T,
    has: s.has
  }

  return (
    <div className={`adm${tab === 'editor' ? ' adm-editing' : ''}`}>
      <aside className="adm-side">
        <img
          src={assets.branding.logo}
          alt="ANVA LUXURY"
        />

        <nav>
          {TABS.map(([key, Icon]) => (
            <Link
              key={key}
              to={`/${lang}/admin/${key}`}
              className={tab === key ? 'on' : ''}
            >
              <span>
                <Icon size={20} />
              </span>

              {T(key as AKey)}
            </Link>
          ))}
        </nav>

        <div className="me glass">
          <b>Admin</b>
          <small>{s.roles.join(', ')}</small>
        </div>

        <button
          className="out"
          onClick={async () => {
            await adminSupabase.auth.signOut()
            sessionStorage.removeItem('anva_admin_login_logged')
            nav(`/${lang}/admin/login`, {
              replace: true
            })
          }}
        >
          <Logout size={18} />
          {T('logout')}
        </button>
      </aside>

      <main className="adm-main">
        <header>
          <time>
            {new Date().toLocaleString(
              lang === 'en'
                ? 'en-GB'
                : lang === 'ru'
                  ? 'ru-RU'
                  : 'hy-AM',
              {
                dateStyle: 'short',
                timeStyle: 'short'
              }
            )}
          </time>

          <Link to={`/${lang}`}>
            {T('site')} ↗
          </Link>
        </header>

        {tab === 'dashboard' && (
          <Dashboard {...ctx} />
        )}

        {tab === 'products' &&
          (s.has('product_manager') ? (
            <Products {...ctx} />
          ) : (
            <p className="glass box">{T('no_perm')}</p>
          ))}

        {tab === 'categories' &&
          (s.has('product_manager') ? (
            <Categories {...ctx} />
          ) : (
            <p className="glass box">{T('no_perm')}</p>
          ))}

        {tab === 'promos' &&
          (s.has('product_manager') ? (
            <Promotions {...ctx} />
          ) : (
            <p className="glass box">{T('no_perm')}</p>
          ))}

        {tab === 'reviews' &&
          (s.has('super_admin') ? (
            <Reviews {...ctx} />
          ) : (
            <p className="glass box">{T('no_perm')}</p>
          ))}

        {tab === 'analytics' &&
          (s.has('analyst') ? (
            <Analytics {...ctx} />
          ) : (
            <p className="glass box">{T('no_perm')}</p>
          ))}

        {tab === 'admins' &&
          (s.has('super_admin') ? (
            <Admins {...ctx} />
          ) : (
            <p className="glass box">{T('no_perm')}</p>
          ))}

        {tab === 'notifs' && (
          <Notifications {...ctx} />
        )}

        {tab === 'editor' &&
          (s.has('content_manager') ? (
            <SiteEditor {...ctx} />
          ) : (
            <p className="glass box">{T('no_perm')}</p>
          ))}

        {tab === 'homepage' &&
          (s.has('content_manager') ? (
            <HomepageEditor {...ctx} />
          ) : (
            <p className="glass box">{T('no_perm')}</p>
          ))}

        {tab === 'settings' &&
          (s.has('content_manager') ? (
            <Settings {...ctx} />
          ) : (
            <p className="glass box">{T('no_perm')}</p>
          ))}
      </main>
    </div>
  )
}