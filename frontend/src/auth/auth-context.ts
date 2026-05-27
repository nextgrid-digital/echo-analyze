import { createContext } from "react"
import type { Session, User } from "@/lib/supabase"

export interface AuthContextValue {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  username: string
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
