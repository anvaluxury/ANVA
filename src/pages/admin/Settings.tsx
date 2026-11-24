import { useEffect, useState } from 'react'
import { adminSupabase as supabase } from '../../lib/supabase'
import type { Ctx } from './Admin'
const KEYS = ['phone', 'email', 'instagram', 'tiktok', 'facebook', 'youtube', 'pinterest'] as const
const SOCIAL = ['instagram', 'tiktok', 'facebook', 'youtube', 'pinterest']
export default function Settings({ T }: Ctx) {
  const [v, setV] = useState<Record<string, string>>({}); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { void supabase.from('site_settings').select('value').eq('key', 'contact').maybeSingle().then(({ data }) => setV(data?.value ?? {})) }, [])
  const save = async () => {
    const clean: Record<string, string> = {}; for (const k of KEYS) clean[k] = (v[k] ?? '').trim()
    if (clean.phone && !/^[+()\d\s-]{6,20}$/.test(clean.phone)) return setMsg(`${T('err')}: ${T('phone')}`)
    if (clean.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) return setMsg(`${T('err')}: email`)
    for (const k of SOCIAL) if (clean[k] && !/^https:\/\//i.test(clean[k])) return setMsg(`${T('err')}: ${k} → https://…`)
    setBusy(true); setMsg('')
    const { error } = await supabase.from('site_settings').upsert({ key: 'contact', value: clean, updated_at: new Date().toISOString() })
    if (error) { setBusy(false); return setMsg(`${T('err')}: ${error.message}`) }
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'contact').maybeSingle()   // read back: confirm it is really stored
    setBusy(false); setV(data?.value ?? clean); setMsg(data?.value?.phone === clean.phone ? T('saved') : `${T('err')}: not saved`)
  }
  return <section className="glass box"><h3>{T('contact')}</h3><div className="grid">
    {KEYS.map(k => <label key={k}>{k}<input value={v[k] ?? ''} inputMode={k === 'phone' ? 'tel' : k === 'email' ? 'email' : 'url'} placeholder={k === 'phone' ? T('phone') : k === 'email' ? 'name@example.com' : T('url')} onChange={e => setV({ ...v, [k]: e.target.value })} /></label>)}</div>
    <div className="acts"><button className="btn-dark" disabled={busy} onClick={save}>{busy ? '…' : T('save')}</button><span role="status">{msg}</span></div></section>
}
