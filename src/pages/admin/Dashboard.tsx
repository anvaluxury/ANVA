import { useEffect, useState } from 'react'
import { adminSupabase } from '../../lib/supabase'
import Security from './Security'
import type { Ctx } from './Admin'

const count = async (
  table: string,
  filter?: (query: any) => any
) => {
  let query: any = adminSupabase
    .from(table)
    .select('*', { count: 'exact', head: true })

  if (filter) {
    query = filter(query)
  }

  const { count: total, error } = await query

  if (error) {
    console.error(`Dashboard count error (${table}):`, error)
    return 0
  }

  return total ?? 0
}

export default function Dashboard({ T }: Ctx) {
  const [n, setN] = useState<number[]>([])

  useEffect(() => {
    let active = true

    void Promise.all([
      count('products'),
      count('categories'),
      count('newsletter_subscribers'),
      count('reviews', query =>
        query.eq('status', 'pending')
      )
    ]).then(values => {
      if (active) setN(values)
    })

    return () => {
      active = false
    }
  }, [])

  const L = [
    'total',
    'cats',
    'subs',
    'pending'
  ] as const

  return (
    <>
      <section className="glass stats">
        {L.map((key, index) => (
          <div key={key}>
            <small>{T(key)}</small>
            <strong>{n[index] ?? '…'}</strong>
          </div>
        ))}
      </section>

      <Security T={T} />
    </>
  )
}