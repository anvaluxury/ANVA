import React from 'react'
import { createRoot } from 'react-dom/client'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useParams,
  useNavigate
} from 'react-router-dom'

import { DEFAULT_LANG, isLang } from './i18n'
import { enforceRemember } from './lib/supabase'

import AuthPage from './pages/AuthPage'
import Home from './pages/Home'
import Admin from './pages/admin/Admin'
import AdminLogin from './pages/admin/AdminLogin'
import Grid from './pages/Grid'
import Account from './pages/Account'

import { CurrencyProvider } from './lib/currency'
import { FavoritesProvider } from './lib/favorites'
import { assets } from './assets'

import './styles/anva.css'
import './styles/responsive.css'
import './styles/welcome.css'

enforceRemember()

const HomeGate = () => {
  const { lang, id } = useParams()
  return isLang(lang) ? <Home lang={lang} productId={id} /> : <Navigate to={`/${DEFAULT_LANG}`} replace />
}

const AdminGate = () => {
  const { lang } = useParams()
  return isLang(lang) ? <Admin lang={lang} /> : <Navigate to={`/${DEFAULT_LANG}/admin`} replace />
}

const AdminLoginGate = () => {
  const { lang } = useParams()
  return isLang(lang) ? <AdminLogin lang={lang} /> : <Navigate to={`/${DEFAULT_LANG}/admin/login`} replace />
}

const GridGate = ({ mode }: { mode: 'category' | 'favorites' }) => {
  const { lang } = useParams()
  return isLang(lang) ? <Grid lang={lang} mode={mode} /> : <Navigate to={`/${DEFAULT_LANG}`} replace />
}

const AccountGate = () => {
  const { lang } = useParams()
  return isLang(lang) ? <Account lang={lang} /> : <Navigate to={`/${DEFAULT_LANG}`} replace />
}

const LangGate = () => {
  const { lang } = useParams()
  return isLang(lang) ? <AuthPage lang={lang} /> : <Navigate to={`/${DEFAULT_LANG}/login`} replace />
}

function WelcomePage() {
  const navigate = useNavigate()

  const enterStore = (mode: 'desktop' | 'mobile') => {
    localStorage.setItem('anva-view-mode', mode)
    document.documentElement.dataset.view = mode
    navigate(`/${DEFAULT_LANG}`)
  }

  return (
    <main className="welcome-screen">

      <div className="welcome-glow welcome-glow-one" />
      <div className="welcome-glow welcome-glow-two" />

      <div className="welcome-content">

        <div className="welcome-brand">
          <img
            src={assets.branding.logo}
            alt="ANVA LUXURY"
            className="welcome-logo"
          />
          <span className="welcome-brand-line" />
          <p>THE ART OF ELEGANCE</p>
        </div>

        <div className="welcome-heading">
          <span>AN EXCLUSIVE EXPERIENCE</span>

          <h1>
            WELCOME TO
            <br />
            <em>ANVA LUXURY</em>
          </h1>

          <p>Choose your experience</p>
        </div>

        <div className="welcome-options">

          <button
            onClick={() => enterStore('desktop')}
            className="welcome-card"
          >
            <div className="welcome-device desktop-device">
              <div className="desktop-screen">
                <span>ANVA</span>
                <small>LUXURY</small>
              </div>
              <div className="desktop-base" />
            </div>

            <span className="welcome-card-number">01</span>

            <div className="welcome-card-info">
              <h2>DESKTOP</h2>
              <p>Explore on a larger screen</p>
              <span className="welcome-enter">
                ENTER EXPERIENCE <b>↗</b>
              </span>
            </div>
          </button>

          <button
            onClick={() => enterStore('mobile')}
            className="welcome-card"
          >
            <div className="welcome-device mobile-device">
              <div className="mobile-screen">
                <span>ANVA</span>
                <small>LUXURY</small>
              </div>
            </div>

            <span className="welcome-card-number">02</span>

            <div className="welcome-card-info">
              <h2>MOBILE</h2>
              <p>Explore on your mobile device</p>
              <span className="welcome-enter">
                ENTER EXPERIENCE <b>↗</b>
              </span>
            </div>
          </button>

        </div>

        <footer className="welcome-footer">
          <span>ANVA LUXURY</span>
          <span>TIMELESS BEAUTY · EXCLUSIVE DESIGN</span>
          <span>EST. 2026</span>
        </footer>

      </div>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CurrencyProvider>
      <FavoritesProvider>
        <BrowserRouter>
          <Routes>

            <Route path="/" element={<WelcomePage />} />

            <Route path="/:lang/login" element={<LangGate />} />
            <Route path="/:lang/account" element={<AccountGate />} />
            <Route path="/:lang/admin/login" element={<AdminLoginGate />} />
            <Route path="/:lang/admin" element={<AdminGate />} />
            <Route path="/:lang/admin/:tab" element={<AdminGate />} />

            <Route path="/:lang" element={<HomeGate />} />
            <Route path="/:lang/p/:id" element={<HomeGate />} />

            <Route path="/:lang/c/:slug" element={<GridGate mode="category" />} />
            <Route path="/:lang/c/:slug/p/:id" element={<GridGate mode="category" />} />

            <Route path="/:lang/favorites" element={<GridGate mode="favorites" />} />
            <Route path="/:lang/favorites/p/:id" element={<GridGate mode="favorites" />} />

            <Route path="*" element={<Navigate to={`/${DEFAULT_LANG}`} replace />} />

          </Routes>
        </BrowserRouter>
      </FavoritesProvider>
    </CurrencyProvider>
  </React.StrictMode>
)