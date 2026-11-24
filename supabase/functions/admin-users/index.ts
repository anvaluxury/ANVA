// Server-side admin management. Uses the service-role key ONLY here (never in the browser).
// Deploy: supabase functions deploy admin-users   (SUPABASE_URL / SERVICE_ROLE_KEY are provided automatically)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const ROLES = ['super_admin', 'product_manager', 'content_manager', 'analyst']
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return json({ error: 'unauthorized' }, 401)
  const aal = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).aal
  const { data: mine } = await admin.from('user_roles').select('role').eq('user_id', user.id)
  const roles = (mine ?? []).map((r: any) => r.role)
  if (!roles.length) return json({ error: 'forbidden' }, 403)
  const { data: fx } = await admin.auth.admin.mfa.listFactors({ userId: user.id })
  if ((fx?.factors ?? []).some((f: any) => f.status === 'verified') && aal !== 'aal2') return json({ error: 'mfa_required' }, 403)
  let b: any; try { b = await req.json() } catch { return json({ error: 'bad_json' }, 400) }
  if (b.action === 'log_login') { await admin.from('login_history').insert({ user_id: user.id, event: 'admin_login', user_agent: (req.headers.get('user-agent') ?? '').slice(0, 300) }); return json({ ok: true }) }
  if (!roles.includes('super_admin')) return json({ error: 'forbidden' }, 403)
  const audit = (target: string | null, details: object) => admin.from('audit_logs').insert({ actor: user.id, action: `admin ${b.action}`, entity: 'user_roles', entity_id: target, details })
  try {
    if (b.action === 'list') {
      const { data } = await admin.from('user_roles').select('user_id,role'); const by = new Map<string, string[]>()
      for (const r of data ?? []) by.set(r.user_id, [...(by.get(r.user_id) ?? []), r.role])
      const out = []; for (const [id, rs] of by) { const { data: u } = await admin.auth.admin.getUserById(id); out.push({ user_id: id, email: u.user?.email, roles: rs }) }
      return json({ admins: out })
    }
    if (b.action === 'create') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email ?? '') || (b.password ?? '').length < 12 || !ROLES.includes(b.role)) return json({ error: 'invalid_input' }, 400)
      const { data, error } = await admin.auth.admin.createUser({ email: b.email, password: b.password, email_confirm: true })
      if (error || !data.user) return json({ error: error?.message ?? 'create_failed' }, 400)
      await admin.from('user_roles').insert({ user_id: data.user.id, role: b.role, granted_by: user.id }); await audit(data.user.id, { role: b.role, email: b.email }); return json({ ok: true })
    }
    if (b.action === 'grant') {
      if (!ROLES.includes(b.role)) return json({ error: 'invalid_input' }, 400)
      const { data } = await admin.auth.admin.listUsers({ perPage: 1000 }); const u = data.users.find((x: any) => x.email?.toLowerCase() === String(b.email ?? '').toLowerCase())
      if (!u) return json({ error: 'user_not_found' }, 404)
      await admin.from('user_roles').upsert({ user_id: u.id, role: b.role, granted_by: user.id }, { ignoreDuplicates: true }); await audit(u.id, { role: b.role }); return json({ ok: true })
    }
    if (b.action === 'revoke') {
      if (!ROLES.includes(b.role)) return json({ error: 'invalid_input' }, 400)
      if (b.role === 'super_admin') { const { count } = await admin.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'super_admin'); if (b.user_id === user.id || (count ?? 0) <= 1) return json({ error: 'cannot_remove_last_super_admin' }, 400) }
      await admin.from('user_roles').delete().eq('user_id', b.user_id).eq('role', b.role); await audit(b.user_id, { role: b.role }); return json({ ok: true })
    }
    return json({ error: 'unknown_action' }, 400)
  } catch (e) { return json({ error: String(e) }, 500) }
})
