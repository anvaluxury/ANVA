import { adminSupabase } from './supabase'
import { uuid } from './uuid'

export const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const HERO_TYPES: Record<string, 'video' | 'image'> = { 'video/mp4': 'video', 'video/webm': 'video', 'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image' }
export const MAX_IMAGE = 5 * 1024 * 1024
export const MAX_HERO = 50 * 1024 * 1024   // = file_size_limit of the existing hero-media bucket

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' }

/** Uploads a NEW object (never overwrites). Returns the storage path. Uses the admin session, so storage RLS still decides who may write. */
export async function uploadBlob(bucket: string, blob: Blob, folder: string, maxBytes: number): Promise<string> {
  const ext = EXT[blob.type]; if (!ext) throw new Error('type')
  if (blob.size > maxBytes) throw new Error('size')
  const path = `${folder}/${uuid()}.${ext}`
  const { error } = await adminSupabase.storage.from(bucket).upload(path, blob, { contentType: blob.type, cacheControl: '31536000' })
  if (error) throw error
  return path
}

export const fmtBytes = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
export const fmtTime = (s: number) => { const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}` }
