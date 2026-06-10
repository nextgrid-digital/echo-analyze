import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/auth/useAuth"
import { withAuthRedirect } from "@/lib/authRedirect"

interface AuthRequiredProps {
  children: ReactNode
}

export function AuthRequired({ children }: AuthRequiredProps) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return (
      <Navigate to={withAuthRedirect("/sign-in", location.pathname)} replace />
    )
  }

  return children
}
