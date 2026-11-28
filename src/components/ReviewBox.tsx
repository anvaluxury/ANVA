import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lang } from '../../supabase/functions/auto-translate'
import { a } from '../i18n/admin'
import { useSession } from '../lib/auth'
import { supabase } from '../lib/supabase'
export default function ReviewBox({ id, lang, list }: { id: string; lang: Lang; list: any[] }) {
  const { user } = useSession(); const [rating, setRating] = useState(5); const [text, setText] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const send = async () => { if (!user) return; setBusy(true); setMsg('')
    const { error } = await supabase.from('reviews').upsert({ product_id: id, user_id: user.id, rating, body: text.trim() || null, status: 'pending' }, { onConflict: 'product_id,user_id' })
    setBusy(false); setMsg(error ? `${a(lang, 'err')}: ${error.message}` : a(lang, 'review_sent')); if (!error) setText('') }
  return <div className="rvs">
    {list.slice(0, 4).map((r, i) => <blockquote key={i}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}{r.body && <p>{r.body}</p>}</blockquote>)}
    {user ? <details><summary>{a(lang, 'write_review')}</summary>
      <label>{a(lang, 'rating')}<select value={rating} onChange={e => setRating(+e.target.value)}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)}</option>)}</select></label>
      <textarea rows={2} maxLength={2000} value={text} onChange={e => setText(e.target.value)} />
      <button className="btn-light sm" disabled={busy} onClick={send}>{busy ? '…' : a(lang, 'submit')}</button>{msg && <p role="status">{msg}</p>}</details>
      : <Link className="link" to={`/${lang}/login`}>{a(lang, 'login_to_review')}</Link>}
  </div>
}
