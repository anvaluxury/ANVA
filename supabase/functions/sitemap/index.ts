// Public sitemap with hreflang alternates. Deploy: supabase functions deploy sitemap --no-verify-jwt ; supabase secrets set SITE_URL=https://your-domain
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const L = ['hy', 'ru', 'en']
Deno.serve(async () => {
  const site = (Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '')
  if (!site) return new Response('SITE_URL secret is not set', { status: 500 })
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)   // RLS exposes only active items
  const [p, c] = await Promise.all([sb.from('products').select('id,updated_at').eq('is_active', true), sb.from('categories').select('slug').eq('is_active', true)])
  const entry = (path: string, last?: string) => L.map(l => `<url><loc>${site}/${l}${path}</loc>${last ? `<lastmod>${last.slice(0, 10)}</lastmod>` : ''}${L.map(a => `<xhtml:link rel="alternate" hreflang="${a}" href="${site}/${a}${path}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${site}/hy${path}"/></url>`).join('')
  const body = entry('') + (c.data ?? []).map((x: any) => entry(`/c/${x.slug}`)).join('') + (p.data ?? []).map((x: any) => entry(`/p/${x.id}`, x.updated_at)).join('')
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${body}</urlset>`, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' } })
})
