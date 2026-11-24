import { useCallback, useEffect, useState } from 'react'
import { adminSupabase as supabase } from '../../lib/supabase'
import type { Ctx } from './Admin'
const ROLES = ['super_admin', 'product_manager', 'content_manager', 'analyst']
export default function Admins({ T }: Ctx) {
  const [list, setList] = useState<any[]>([]); const [hist, setHist] = useState<any[]>([]); const [f, setF] = useState({ email: '', password: '', role: 'product_manager' }); const [msg, setMsg] = useState('')
  const call = async (body: object) => { const { data, error } = await supabase.functions.invoke('admin-users', { body }); if (error || data?.error) throw new Error(data?.error ?? error?.message); return data }
  const load = useCallback(async () => { try { setList((await call({ action: 'list' })).admins) } catch (e: any) { setMsg(`${T('err')}: ${e.message}`) }
    setHist((await supabase.from('login_history').select('*').order('created_at', { ascending: false }).limit(30)).data ?? []) }, []) // eslint-disable-line
  useEffect(() => { void load() }, [load])
  const act = async (body: object) => { setMsg(''); try { await call(body); setMsg(T('saved')); setF({ ...f, password: '' }); await load() } catch (e: any) { setMsg(`${T('err')}: ${e.message}`) } }
  return <><section className="glass box"><h3>{T('admins')}</h3><div className="grid">
    <label>{T('email_l')}<input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
    <label>{T('pw12')}<input type="password" autoComplete="new-password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></label>
    <label>{T('role')}<select value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></label></div>
    <div className="acts"><button className="btn-dark" onClick={() => act({ action: 'create', ...f })}>{T('new_admin')}</button><button className="btn-light" onClick={() => act({ action: 'grant', email: f.email, role: f.role })}>{T('grant')}</button><span role="status">{msg}</span></div></section>
    <section className="glass box"><table><tbody>{list.map(a => <tr key={a.user_id}><td>{a.email}</td><td>{a.roles.map((r: string) => <span key={r} className="pill-pink" style={{ background: '#e6e0e6', marginRight: 6 }}>{r} <button onClick={() => confirm(T('confirm_del')) && act({ action: 'revoke', user_id: a.user_id, role: r })}>✕</button></span>)}</td></tr>)}</tbody></table></section>
    <section className="glass box"><h3>{T('login_history')}</h3><div className="scrollx"><table><tbody>{hist.map(h => <tr key={h.id}><td>{new Date(h.created_at).toLocaleString()}</td><td>{String(h.user_id).slice(0, 8)}</td><td>{h.event}</td><td>{String(h.user_agent ?? '').slice(0, 60)}</td></tr>)}</tbody></table></div></section></>
}
