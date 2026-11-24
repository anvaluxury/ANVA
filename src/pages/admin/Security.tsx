import { useEffect, useState } from 'react'
import { adminSupabase } from '../../lib/supabase'
import type { Ctx } from './Admin'

export default function Security({ T }: Pick<Ctx, 'T'>) {
  const [on, setOn] = useState(false)
  const [en, setEn] = useState<any>(null)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true

    void adminSupabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (!active) return

      if (error) {
        setMsg(`${T('err')}: ${error.message}`)
        return
      }

      setOn(!!data?.totp?.some(f => f.status === 'verified'))
    })

    return () => {
      active = false
    }
  }, [T])

  const start = async () => {
    setBusy(true)
    setMsg('')

    try {
      const { data: factors, error: listError } =
        await adminSupabase.auth.mfa.listFactors()

      if (listError) {
        setMsg(`${T('err')}: ${listError.message}`)
        return
      }

      for (const factor of (factors?.all ?? []).filter(
        (item: any) => item.status === 'unverified'
      )) {
        await adminSupabase.auth.mfa.unenroll({
          factorId: factor.id
        })
      }

      const { data, error } =
        await adminSupabase.auth.mfa.enroll({
          factorType: 'totp'
        })

      if (error) {
        setMsg(`${T('err')}: ${error.message}`)
        return
      }

      setEn(data)
    } catch {
      setMsg(T('err'))
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    if (!en?.id || !code.trim()) {
      setMsg(T('err'))
      return
    }

    setBusy(true)
    setMsg('')

    try {
      const { data: challenge, error } =
        await adminSupabase.auth.mfa.challenge({
          factorId: en.id
        })

      if (error) {
        setMsg(`${T('err')}: ${error.message}`)
        return
      }

      const { error: verifyError } =
        await adminSupabase.auth.mfa.verify({
          factorId: en.id,
          challengeId: challenge.id,
          code: code.trim()
        })

      if (verifyError) {
        setMsg(`${T('err')}: ${verifyError.message}`)
        return
      }

      setOn(true)
      setEn(null)
      setCode('')
      setMsg(T('saved'))
    } catch {
      setMsg(T('err'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="glass box">
      <h3>{T('twofa')}</h3>

      {on ? (
        <p>✔ {T('mfa_on')}</p>
      ) : en ? (
        <>
          <p>{T('scan')}</p>

          <img
            src={en.totp.qr_code}
            alt="QR"
            width={180}
          />

          <div className="acts">
            <input
              inputMode="numeric"
              maxLength={6}
              placeholder={T('code')}
              value={code}
              onChange={event => setCode(event.target.value)}
            />

            <button
              className="btn-dark"
              onClick={verify}
              disabled={busy}
            >
              {busy ? '…' : T('verify')}
            </button>
          </div>
        </>
      ) : (
        <button
          className="btn-dark"
          onClick={start}
          disabled={busy}
        >
          {busy ? '…' : T('enable')}
        </button>
      )}

      {msg && (
        <p role="status">{msg}</p>
      )}
    </section>
  )
}