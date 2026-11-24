import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  supabase,
  adminSupabase,
  supabaseConfigured
} from './supabase'
import { uuid } from './uuid'

export type Role =
  | 'super_admin'
  | 'product_manager'
  | 'content_manager'
  | 'analyst'

type SessionClient = typeof supabase

function useAuthSession(client: SessionClient) {
  const [user, setUser] = useState<User | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    let active = true

    const load = async (currentUser: User | null) => {
      if (!active) return

      setUser(currentUser)

      if (currentUser) {
        const { data, error } = await client
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)

        if (!active) return

        setRoles(
          error
            ? []
            : (data ?? []).map((item: { role: Role }) => item.role)
        )
      } else {
        setRoles([])
      }

      if (active) setLoading(false)
    }

    client.auth.getSession().then(({ data }) => {
      void load(data.session?.user ?? null)
    })

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, session) => {
      void load(session?.user ?? null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [client])

  return {
    user,
    roles,
    loading,
    isAdmin: roles.length > 0,
    has: (...requiredRoles: Role[]) =>
      roles.some(
        role =>
          requiredRoles.includes(role) ||
          role === 'super_admin'
      )
  }
}

// Սովորական օգտատերերի session
export function useSession() {
  return useAuthSession(supabase)
}

// Ադմինիստրատորի առանձին session
export function useAdminSession() {
  return useAuthSession(adminSupabase)
}

const OK = [
  'image/jpeg',
  'image/png',
  'image/webp'
]

export async function uploadImage(
  bucket: string,
  file: File,
  folder: string
) {
  if (!OK.includes(file.type)) {
    throw new Error('type')
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('size')
  }

  const extension = file.type.split('/')[1]
  const path = `${folder}/${uuid()}.${extension}`

  const { error } = await adminSupabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '31536000',
      contentType: file.type
    })

  if (error) throw error

  return path
}

export const publicUrl = (
  bucket: string,
  path?: string | null
) =>
  path
    ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
    : ''