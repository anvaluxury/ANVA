import { useState } from 'react'
import { adminSupabase as supabase } from '../../lib/supabase'
import type { Ctx } from './Admin'
export default function MfaGate({ T }: Pick<Ctx, 'T'>) {
  const [code, setCode] = useState(''); const [msg, setMsg] = useState('')
  const go = async () => { const { data } = await supabase.auth.mfa.listFactors(); const f = data?.totp?.[0]; if (!f) return setMsg(T('err'))
    const { data: ch, error } = await supabase.auth.mfa.challenge({ factorId: f.id }); if (error) return setMsg(error.message)
    const { error: e2 } = await supabase.auth.mfa.verify({ factorId: f.id, challengeId: ch.id, code: code.trim() }); e2 ? setMsg(e2.message) : location.reload() }
  return <div className="adm-wait"><div className="glass box"><h3>{T('mfa_need')}</h3><div className="acts"><input inputMode="numeric" maxLength={6} autoFocus value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} placeholder={T('code')} /><button className="btn-dark" onClick={go}>{T('verify')}</button></div>{msg && <p role="alert">{msg}</p>}</div></div>
}
