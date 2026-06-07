export interface EchoPublicConfig {
  supabaseUrl?: string
  supabaseAnonKey?: string
  supabaseAdminRole?: string
}

declare global {
  interface Window {
    __ECHO_PUBLIC_CONFIG__?: EchoPublicConfig
  }
}

let cachedConfig: EchoPublicConfig | null = null
let bootstrapPromise: Promise<EchoPublicConfig> | null = null

function hasSupabaseConfig(config: EchoPublicConfig) {
  return Boolean(config.supabaseUrl?.trim() && config.supabaseAnonKey?.trim())
}

export function getEchoPublicConfig(): EchoPublicConfig {
  if (cachedConfig) {
    return cachedConfig
  }
  return window.__ECHO_PUBLIC_CONFIG__ ?? {}
}

export async function ensureEchoPublicConfig(): Promise<EchoPublicConfig> {
  const existing = getEchoPublicConfig()
  if (hasSupabaseConfig(existing)) {
    cachedConfig = existing
    return existing
  }

  if (!bootstrapPromise) {
    bootstrapPromise = fetch("/api/public-config", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) {
          return existing
        }
        const payload = (await response.json()) as EchoPublicConfig
        if (hasSupabaseConfig(payload)) {
          cachedConfig = payload
          window.__ECHO_PUBLIC_CONFIG__ = payload
          return payload
        }
        return existing
      })
      .catch(() => existing)
      .finally(() => {
        bootstrapPromise = null
      })
  }

  return bootstrapPromise
}
