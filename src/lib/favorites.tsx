import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { useSession } from './auth'
import { supabase } from './supabase'
import { track } from './track'
type F = { ids: Set<string>; has: (id: string) => boolean; toggle: (id: string) => Promise<void>; signedIn: boolean }
const C = createContext<F>(null as any); export const useFavs = () => useContext(C)
const KEY = 'anva_favs'; const local = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] } }
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useSession(); const [ids, setIds] = useState<Set<string>>(new Set(local()))
  useEffect(() => {
    if (!user) return setIds(new Set(local()))
    void (async () => {   // sync anonymous favorites into the account, then load account favorites
      const l = local(); if (l.length) { await supabase.from('favorites').upsert(l.map(p => ({ user_id: user.id, product_id: p })), { ignoreDuplicates: true }); localStorage.removeItem(KEY) }
      const { data } = await supabase.from('favorites').select('product_id').eq('user_id', user.id); setIds(new Set((data ?? []).map((r: any) => r.product_id)))
    })()
  }, [user?.id])   // eslint-disable-line
  const toggle = useCallback(async (id: string) => {
    const on = ids.has(id); const next = new Set(ids); on ? next.delete(id) : next.add(id); setIds(next)
    if (user) { const { error } = on ? await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', id) : await supabase.from('favorites').insert({ user_id: user.id, product_id: id }); if (error) { setIds(ids); return } }
    else localStorage.setItem(KEY, JSON.stringify([...next]))
    track(on ? 'favorite_remove' : 'favorite_add', { product_id: id })
  }, [ids, user])
  return <C.Provider value={{ ids, has: id => ids.has(id), toggle, signedIn: !!user }}>{children}</C.Provider>
}
