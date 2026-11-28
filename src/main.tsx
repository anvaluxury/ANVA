import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import {
  BrowserRouter,
  Navigate,
  Route,
  useParams
} from 'react-router-dom'

import { DEFAULT_LANG, isLang } from '../supabase/functions/auto-translate'
import { enforceRemember } from './lib/supabase'
import { initMotion } from './lib/motion'
import Splash from './components/Splash'
import PageTransition from './components/PageTransition'

import AuthPage from './pages/AuthPage'
import Home from './pages/Home'
import Admin from './pages/admin/Admin'
import AdminLogin from './pages/admin/AdminLogin'
import Grid from './pages/Grid'
import Account from './pages/Account'

import { CurrencyProvider } from './lib/currency'
import { FavoritesProvider } from './lib/favorites'
import { SiteConfigProvider } from './lib/siteConfig'

import './styles/silver.css'
import './styles/silver-pages.css'
import './styles/silver-admin.css'
import './styles/motion.css'
import './styles/theme-noir.css'
import './styles/mobile.css'

enforceRemember()

const MotionBoot = () => { useEffect(() => initMotion(), []); return null }

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

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CurrencyProvider>
      <FavoritesProvider>
        <SiteConfigProvider>
        <BrowserRouter>
          <MotionBoot />
          <Splash />
          <PageTransition>

            <Route path="/" element={<Navigate to={`/${DEFAULT_LANG}`} replace />} />

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

          </PageTransition>
        </BrowserRouter>
        </SiteConfigProvider>
      </FavoritesProvider>
    </CurrencyProvider>
  </React.StrictMode>
)