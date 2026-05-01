import { createContext, useContext } from "react"

export type AuthRuntimeConfig = {
  clerk_publishable_key?: string | null
  clerk_key_type?: string | null
  clerk_frontend_api?: string | null
  clerk_frontend_api_resolves?: boolean | null
}

export const AuthConfigContext = createContext<AuthRuntimeConfig | null>(null)

export function useAuthConfig() {
  return useContext(AuthConfigContext)
}
