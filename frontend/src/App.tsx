import { Suspense, lazy } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { useAuth } from "@/auth/useAuth"
import { AuthRequired } from "@/components/AuthRequired"
import { withAuthRedirect } from "@/lib/authRedirect"
import "./App.css"

const LandingPage = lazy(() =>
  import("@/pages/LandingPage").then((module) => ({ default: module.LandingPage }))
)
const UploadPage = lazy(() =>
  import("@/pages/UploadPage").then((module) => ({ default: module.UploadPage }))
)
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((module) => ({ default: module.DashboardPage }))
)
const ReportPage = lazy(() =>
  import("@/pages/advisor/ReportPage").then((module) => ({ default: module.ReportPage }))
)
const FundDetailPage = lazy(() =>
  import("@/pages/advisor/FundDetailPage").then((module) => ({ default: module.FundDetailPage }))
)
const ClientWorkspacePage = lazy(() =>
  import("@/pages/advisor/ClientWorkspacePage").then((module) => ({
    default: module.ClientWorkspacePage,
  }))
)
const ClientsPage = lazy(() =>
  import("@/pages/advisor/ClientsPage").then((module) => ({ default: module.ClientsPage }))
)
const AdminPage = lazy(() =>
  import("@/pages/AdminPage").then((module) => ({ default: module.AdminPage }))
)
const PricingPage = lazy(() =>
  import("@/pages/PricingPage").then((module) => ({ default: module.PricingPage }))
)
const SignInPage = lazy(() =>
  import("@/pages/SignInPage").then((module) => ({ default: module.SignInPage }))
)
const SignUpPage = lazy(() =>
  import("@/pages/SignUpPage").then((module) => ({ default: module.SignUpPage }))
)
const DemoPage = lazy(() =>
  import("@/pages/DemoPage").then((module) => ({ default: module.DemoPage }))
)
const TermsPage = lazy(() =>
  import("@/pages/TermsPage").then((module) => ({ default: module.TermsPage }))
)
const PrivacyPage = lazy(() =>
  import("@/pages/PrivacyPage").then((module) => ({ default: module.PrivacyPage }))
)
const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage }))
)

function App() {
  const { loading, user, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        Loading...
      </div>
    )
  }

  const authRequired = (element: React.ReactNode) => (
    <AuthRequired>{element}</AuthRequired>
  )

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/dashboard" element={authRequired(<DashboardPage />)} />
        <Route path="/dashboard/holdings/:holdingKey" element={authRequired(<FundDetailPage />)} />
        <Route path="/dashboard/report" element={authRequired(<ReportPage />)} />
        <Route path="/clients" element={authRequired(<ClientsPage />)} />
        <Route path="/clients/:pan" element={authRequired(<ClientWorkspacePage />)} />
        <Route
          path="/admin"
          element={
            user && isAdmin ? (
              <AdminPage />
            ) : (
              <Navigate to={withAuthRedirect("/sign-in", location.pathname)} replace />
            )
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default App
