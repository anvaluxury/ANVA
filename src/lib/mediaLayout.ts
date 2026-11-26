import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { adminSupabase, supabase } from './supabase'

export type MediaLayout = {
  fit: 'cover' | 'contain'
  x: number
  y: number
  scale: number
}
export type MediaLayouts = Record<string, MediaLayout>
export const DEFAULT_MEDIA_LAYOUT: MediaLayout = { fit: 'cover', x: 50, y: 50, scale: 100 }
export const mediaLayoutKey = (bucket: string, path: string) => `${bucket}:${path}`
export const mediaStyle = (layout?: MediaLayout): CSSProperties => ({
  objectFit: layout?.fit ?? 'cover',
  objectPosition: `${layout?.x ?? 50}% ${layout?.y ?? 50}%`,
  transform: `scale(${(layout?.scale ?? 100) / 100})`,
})

export async function readMediaLayouts(): Promise<MediaLayouts> {
  const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'media_layouts').maybeSingle()
  if (error) throw error
  return (data?.value ?? {}) as MediaLayouts
}

export async function writeMediaLayout(bucket: string, path: string, layout: MediaLayout) {
  const current = await readMediaLayouts()
  const value = { ...current, [mediaLayoutKey(bucket, path)]: layout }
  const { error } = await adminSupabase.from('site_settings').upsert({ key: 'media_layouts', value, updated_at: new Date().toISOString() })
  if (error) throw error
}

export function useMediaLayouts() {
  const [layouts, setLayouts] = useState<MediaLayouts>({})
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let live = true
    void readMediaLayouts().then(value => { if (live) setLayouts(value) }).catch(() => undefined).finally(() => { if (live) setReady(true) })
    return () => { live = false }
  }, [])
  const get = useCallback((bucket: string, path?: string | null) => path ? layouts[mediaLayoutKey(bucket, path)] ?? DEFAULT_MEDIA_LAYOUT : DEFAULT_MEDIA_LAYOUT, [layouts])
  return { layouts, get, ready }
}
