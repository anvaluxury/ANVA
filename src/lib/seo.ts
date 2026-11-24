import type { Lang } from '../i18n'
export const SITE = ((import.meta.env.VITE_SITE_URL as string | undefined) ?? location.origin).replace(/\/$/, '')
export const abs = (u: string) => (u.startsWith('http') ? u : SITE + u)
const LANGS = ['hy', 'ru', 'en']; const LOC: Record<string, string> = { hy: 'hy_AM', ru: 'ru_RU', en: 'en_US' }
type O = { title: string; description?: string; lang: Lang; path?: string; image?: string; noindex?: boolean; jsonLd?: object[] }
export function setSeo(o: O) {
  document.title = o.title; document.documentElement.lang = o.lang
  const meta = (attr: 'name' | 'property', key: string, content: string) => { let el = document.head.querySelector(`meta[${attr}="${key}"]`); if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) } el.setAttribute('content', content) }
  meta('name', 'description', o.description ?? ''); meta('name', 'robots', o.noindex ? 'noindex,nofollow' : 'index,follow')
  meta('property', 'og:title', o.title); meta('property', 'og:description', o.description ?? ''); meta('property', 'og:type', 'website'); meta('property', 'og:locale', LOC[o.lang]); meta('name', 'twitter:card', 'summary_large_image')
  if (o.image) meta('property', 'og:image', abs(o.image))
  document.head.querySelectorAll('link[data-seo]').forEach(e => e.remove())
  const link = (rel: string, href: string, hreflang?: string) => { const l = document.createElement('link'); l.rel = rel; l.href = href; if (hreflang) l.hreflang = hreflang; l.dataset.seo = '1'; document.head.appendChild(l) }
  if (!o.noindex && o.path !== undefined) { link('canonical', `${SITE}/${o.lang}${o.path}`); LANGS.forEach(l => link('alternate', `${SITE}/${l}${o.path}`, l)); link('alternate', `${SITE}/hy${o.path}`, 'x-default') }
  document.getElementById('ld-json')?.remove()
  if (o.jsonLd?.length) { const s = document.createElement('script'); s.type = 'application/ld+json'; s.id = 'ld-json'; s.textContent = JSON.stringify(o.jsonLd); document.head.appendChild(s) }
}
