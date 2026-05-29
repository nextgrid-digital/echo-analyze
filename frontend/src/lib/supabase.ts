import { createClient, type Session, type SupabaseClient, type User } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.APP_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.APP_SUPABASE_ANON_KEY?.trim()

let client: SupabaseClient | null = null

function isHttpUrl(value: string | undefined) {
  if (!value) {
    return false
  }

  try {
    const parsed = new URL(value)
    return parsed.protocol === "https:" || parsed.protocol === "http:"
  } catch {
    return false
  }
}

export function isSupabaseConfigured() {
  return Boolean(isHttpUrl(supabaseUrl) && supabaseAnonKey)
}

export function getSupabaseAuthHost() {
  if (!supabaseUrl) {
    return "missing Supabase URL"
  }

  try {
    return new URL(supabaseUrl).host
  } catch {
    return "invalid Supabase URL"
  }
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null
  }

  if (!client) {
    try {
      client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    } catch {
      return null
    }
  }

  return client
}

export function getUsernameFromUser(user: User | null | undefined) {
  if (!user) {
    return "Unknown user"
  }

  const metadata = user.user_metadata ?? {}
  const username =
    metadata.username ??
    metadata.preferred_username ??
    metadata.name ??
    metadata.full_name

  if (typeof username === "string" && username.trim()) {
    return username.trim()
  }

  return `user_${user.id.slice(0, 8)}`
}

function metadataRoles(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) {
    return []
  }

  const roles: string[] = []
  for (const key of ["role", "user_role"]) {
    const value = metadata[key]
    if (typeof value === "string") {
      roles.push(value)
    }
  }
  for (const key of ["roles", "user_roles"]) {
    const value = metadata[key]
    if (Array.isArray(value)) {
      roles.push(...value.map(String))
    } else if (typeof value === "string") {
      roles.push(...value.split(","))
    }
  }

  return roles.map((role) => role.trim().toLowerCase()).filter(Boolean)
}

export function isSupabaseAdminUser(user: User | null | undefined) {
  if (!user) {
    return false
  }

  const adminRole = import.meta.env.APP_SUPABASE_ADMIN_ROLE?.trim().toLowerCase() || "admin"
  const appMetadata = user.app_metadata ?? {}
  const roles = new Set(metadataRoles(appMetadata))

  return roles.has(adminRole) || appMetadata.is_admin === true
}

export async function getSupabaseAccessToken() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase.auth.getSession()
  if (error) {
    return null
  }

  return data.session?.access_token ?? null
}

export type { Session, User }
