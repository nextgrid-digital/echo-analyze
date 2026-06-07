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

export function getEchoPublicConfig(): EchoPublicConfig {
  return window.__ECHO_PUBLIC_CONFIG__ ?? {}
}
