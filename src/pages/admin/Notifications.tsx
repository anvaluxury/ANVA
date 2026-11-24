import { useCallback, useEffect, useState } from 'react'
import { adminSupabase as supabase } from '../../lib/supabase'
import type { Ctx } from './Admin'
export default function Notifications({ T, has }: Ctx) {
  const [rows, setRows] = useState<any[]>([]); const [log, setLog] = useState<any[]>([])
  const load = useCallback(async () => { setRows((await supabase.from('admin_notifications').select('*').order('created_at', { ascending: false }).limit(50)).data ?? [])
    if (has('super_admin')) setLog((await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50)).data ?? []) }, []) // eslint-disable-line
  useEffect(() => { void load() }, [load])
  const read = async (id: string) => { await supabase.from('admin_notifications').update({ is_read: true }).eq('id', id); await load() }
  return <><section className="glass box"><h3>{T('notifs')}</h3>{rows.map(r => <div key={r.id} className="rv-row" style={{ opacity: r.is_read ? .55 : 1 }}>
    <b>{T(`n_${r.kind}` as any) || r.message}</b> <small>{new Date(r.created_at).toLocaleString()}</small>{!r.is_read && <button onClick={() => read(r.id)}>✔ {T('mark_read')}</button>}</div>)}{!rows.length && <p>{T('none_yet')}</p>}</section>
    {has('super_admin') && <section className="glass box"><h3>{T('audit')}</h3><div className="scrollx"><table><tbody>{log.map(l => <tr key={l.id}><td>{new Date(l.created_at).toLocaleString()}</td><td>{l.action}</td><td>{String(l.entity_id ?? '').slice(0, 12)}</td><td>{String(l.actor ?? '').slice(0, 8)}</td></tr>)}</tbody></table></div></section>}</>
}
