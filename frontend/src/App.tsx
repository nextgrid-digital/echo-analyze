import { Suspense, lazy } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { useAuth } from "@/auth/useAuth"
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
const AdminPage = lazy(() =>
  import("@/pages/AdminPage").then((module) => ({ default: module.AdminPage }))
)
const PricingPage = lazy(() =>
  import("@/pages/PricingPage").then((module) => ({ default: module.PricingPage }))
)

function App() {
  const { loading, user, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        Loading...
      </div>
    )
  }

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
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route
          path="/dashboard"
          element={user ? <DashboardPage /> : <Navigate to="/upload" replace />}
        />
        <Route
          path="/admin"
          element={user && isAdmin ? <AdminPage /> : <Navigate to="/upload" replace />}
        />
      </Routes>
    </Suspense>
  )
}

export default App
