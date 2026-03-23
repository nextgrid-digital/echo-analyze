import type { PropsWithChildren } from "react"
import { Navigate, useLocation } from "react-router-dom"

import { useAuth } from "@/lib/auth"

function FullPageMessage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">ECHO Access</p>
        <h1 className="text-3xl font-semibold">Secure access required</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

export function ProtectedRoute({ children }: PropsWithChildren) {
  const location = useLocation()
  const { isConfigured, loading, session } = useAuth()

  if (loading) {
    return <FullPageMessage message="Checking your session." />
  }

  if (!isConfigured) {
    return (
      <FullPageMessage message="Authentication is temporarily unavailable." />
    )
  }

  if (!session) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />
  }

  return <>{children}</>
}

export function AdminRoute({ children }: PropsWithChildren) {
  const { isAdmin, loading, session } = useAuth()

  if (loading) {
    return <FullPageMessage message="Checking your access." />
  }

  if (!session) {
    return <Navigate to="/auth?next=%2Fadmin" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
