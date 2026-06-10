import { Navigate } from "react-router-dom"
import { AuthForm } from "@/features/auth/components/auth-form"

export { AuthForm }

/** @deprecated Use /sign-in route instead */
export function AuthPage() {
  return <Navigate to="/sign-in" replace />
}

/** @deprecated Use SignInPage or AuthForm with mode prop */
export function AuthPanel() {
  return <AuthForm mode="sign-in" />
}
