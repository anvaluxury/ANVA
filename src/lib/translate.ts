// Automatic Armenian -> Russian/English translation (MyMemory free API, no key needed).
// Optional: add VITE_TRANSLATE_EMAIL=your@email to .env to raise the free daily limit.
// Returns null when translation is unavailable (limit / network) so the caller can continue without it.
const EMAIL = import.meta.env.VITE_TRANSLATE_EMAIL as string | undefined
const cache = new Map<string, string>()
const decode = (s: string) => new DOMParser().parseFromString(s, 'text/html').documentElement.textContent ?? s
async function one(text: string, to: string): Promise<string | null> {
  try {
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=hy|${to}${EMAIL ? `&de=${encodeURIComponent(EMAIL)}` : ''}`)
    if (!r.ok) return null
    const d = await r.json(); const t: string | undefined = d?.responseData?.translatedText
    if (Number(d?.responseStatus) !== 200 || !t || /MYMEMORY WARNING|INVALID LANGUAGE/i.test(t)) return null
    return decode(t)
  } catch { return null }
}
export async function translate(text: string, to: 'ru' | 'en'): Promise<string | null> {
  const src = text.trim(); if (!src) return ''
  const key = `${to}:${src}`; if (cache.has(key)) return cache.get(key)!
  const parts: string[] = []; let cur = ''
  for (let s of src.split(/(?<=[.!?։\n])\s*/).filter(Boolean)) {
    while (s.length > 450) { if (cur) { parts.push(cur); cur = '' } parts.push(s.slice(0, 450)); s = s.slice(450) }
    if ((cur + ' ' + s).length > 450) { if (cur) parts.push(cur); cur = s } else cur = cur ? `${cur} ${s}` : s
  }
  if (cur) parts.push(cur)
  const out: string[] = []
  for (const p of parts) { const t = await one(p, to); if (t === null) return null; out.push(t) }
  const res = out.join(' ').trim(); cache.set(key, res); return res
}
