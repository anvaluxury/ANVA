import { useEffect, useState } from 'react'
import { adminSupabase as supabase } from '../../lib/supabase'
import type { Ctx } from './Admin'

const KEYS = ['phone', 'email', 'instagram', 'tiktok', 'facebook', 'youtube', 'pinterest'] as const
const SOCIAL = ['instagram', 'tiktok', 'facebook', 'youtube', 'pinterest']

export default function Settings({ T }: Ctx) {
  const [v, setV] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [dockTransparency, setDockTransparency] = useState(85)
  const [dockMsg, setDockMsg] = useState('')
  const [dockBusy, setDockBusy] = useState(false)

  useEffect(() => {
    void supabase.from('site_settings').select('value').eq('key', 'contact').maybeSingle()
      .then(({ data }) => setV(data?.value ?? {}))
    void supabase.from('site_settings').select('value').eq('key', 'mobile_dock').maybeSingle()
      .then(({ data }) => {
        const raw = Number((data?.value as { transparency?: number } | null)?.transparency)
        if (Number.isFinite(raw)) setDockTransparency(Math.min(95, Math.max(0, raw)))
      })
  }, [])

  const save = async () => {
    const clean: Record<string, string> = {}
    for (const k of KEYS) clean[k] = (v[k] ?? '').trim()
    if (clean.phone && !/^[+()\d\s-]{6,20}$/.test(clean.phone)) return setMsg(`${T('err')}: ${T('phone')}`)
    if (clean.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) return setMsg(`${T('err')}: email`)
    for (const k of SOCIAL) if (clean[k] && !/^https:\/\//i.test(clean[k])) return setMsg(`${T('err')}: ${k} → https://…`)
    setBusy(true); setMsg('')
    const { error } = await supabase.from('site_settings').upsert({ key: 'contact', value: clean, updated_at: new Date().toISOString() })
    if (error) { setBusy(false); return setMsg(`${T('err')}: ${error.message}`) }
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'contact').maybeSingle()
    setBusy(false); setV(data?.value ?? clean); setMsg(data?.value?.phone === clean.phone ? T('saved') : `${T('err')}: not saved`)
  }

  const saveDock = async () => {
    setDockBusy(true); setDockMsg('')
    const { error } = await supabase.from('site_settings').upsert({
      key: 'mobile_dock', value: { transparency: dockTransparency }, updated_at: new Date().toISOString()
    })
    setDockBusy(false)
    setDockMsg(error ? `${T('err')}: ${error.message}` : T('saved'))
  }

  return <>
    <section className="glass box">
      <h3>{T('contact')}</h3>
      <div className="grid">
        {KEYS.map(k => <label key={k}>{k}<input value={v[k] ?? ''} inputMode={k === 'phone' ? 'tel' : k === 'email' ? 'email' : 'url'} placeholder={k === 'phone' ? T('phone') : k === 'email' ? 'name@example.com' : T('url')} onChange={e => setV({ ...v, [k]: e.target.value })} /></label>)}
      </div>
      <div className="acts"><button className="btn-dark" disabled={busy} onClick={save}>{busy ? '…' : T('save')}</button><span role="status">{msg}</span></div>
    </section>

    <section className="glass box" style={{ marginTop: 18 }}>
      <h3>Հեռախոսի Liquid Glass մենյու</h3>
      <p style={{ opacity: .8, margin: '8px 0 14px' }}>Կարգավորիր հեռախոսի ներքևի ապակե մենյուի թափանցիկությունը։ Պահպանելուց հետո կարգավորումը կկիրառվի կայքի հեռախոսային տարբերակում։</p>
      <label style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
        <span>Թափանցիկություն՝ <strong>{dockTransparency}%</strong></span>
        <input type="range" min="0" max="95" step="1" value={dockTransparency} onChange={e => setDockTransparency(Number(e.target.value))} />
        <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: .7 }}><span>Ավելի անթափանց</span><span>Ավելի թափանցիկ</span></span>
      </label>
      <div className="acts"><button className="btn-dark" disabled={dockBusy} onClick={saveDock}>{dockBusy ? '…' : 'Պահպանել էֆեկտը'}</button><span role="status">{dockMsg}</span></div>
    </section>
  </>
}
