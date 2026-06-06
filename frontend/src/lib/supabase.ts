import { createClient, type Session, type SupabaseClient, type User } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.APP_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.APP_SUPABASE_ANON_KEY?.trim()

let client: SupabaseClient | null = null

const PAN_PATTERN = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/gi
const EMAIL_PATTERN = /(?<![A-Za-z0-9_])[A-Za-z0-9][\w.+-]*@[\w.-]+\.[A-Za-z]{2,}(?![A-Za-z0-9_])/gi
const PHONE_PATTERN = /(?<![\d.])(?:\+?\d[\d\-\s]{8,}\d)(?![\d.])/g

function isLoopbackHost(host: string) {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "")
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  )
}

function isSupabaseCloudHost(host: string) {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "")
  return normalized === "supabase.co" || normalized.endsWith(".supabase.co")
}

function isAllowedSupabaseUrl(value: string | undefined) {
  if (!value) {
    return false
  }

  try {
    const parsed = new URL(value)
    if (parsed.protocol === "https:" && (isSupabaseCloudHost(parsed.hostname) || isLoopbackHost(parsed.hostname))) {
      return true
    }
    return parsed.protocol === "http:" && isLoopbackHost(parsed.hostname)
  } catch {
    return false
  }
}

export function isSupabaseConfigured() {
  return Boolean(isAllowedSupabaseUrl(supabaseUrl) && supabaseAnonKey)
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
    return username
      .trim()
      .replace(PAN_PATTERN, "[redacted-pan]")
      .replace(/[\r\n\t]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(EMAIL_PATTERN, "[redacted-email]")
      .replace(PHONE_PATTERN, "[redacted-phone]")
      .trim()
      .slice(0, 80) || `user_${user.id.slice(0, 8)}`
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

function metadataFlagEnabled(value: unknown) {
  if (typeof value === "boolean") {
    return value
  }
  if (typeof value === "string") {
    return ["true", "1", "yes"].includes(value.trim().toLowerCase())
  }
  if (typeof value === "number") {
    return value === 1
  }
  return false
}

export function isSupabaseAdminUser(user: User | null | undefined) {
  if (!user) {
    return false
  }

  const adminRole = import.meta.env.APP_SUPABASE_ADMIN_ROLE?.trim().toLowerCase() || "admin"
  const appMetadata = user.app_metadata ?? {}
  const roles = new Set(metadataRoles(appMetadata))

  return roles.has(adminRole) || metadataFlagEnabled(appMetadata.is_admin)
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
