import { Navigate, useNavigate } from "react-router-dom"
import { useAuth } from "@/auth/useAuth"
import { withAuthRedirect } from "@/lib/authRedirect"
import { SiteHeader } from "@/components/SiteHeader"
import { CasUploadPanel } from "@/components/upload/CasUploadPanel"
import { buildClientWorkspacePath } from "@/lib/clientWorkspace"

export function UploadPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="marketing-page flex min-h-screen items-center justify-center text-foreground">
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to={withAuthRedirect("/sign-in", "/upload")} replace />
  }

  return (
    <div className="marketing-page min-h-screen text-foreground">
      <SiteHeader />
      <div className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-3xl">
          <header className="mb-10 text-center sm:mb-12">
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Add a client portfolio
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
              Upload a statement to build the client workspace.
            </p>
          </header>

          <CasUploadPanel
            onAnalysisComplete={(pan) => navigate(buildClientWorkspacePath(pan))}
          />
        </div>
      </div>
    </div>
  )
}
