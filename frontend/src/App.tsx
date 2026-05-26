import { Suspense, lazy } from "react"
import { Route, Routes } from "react-router-dom"
import "./App.css"

const UploadPage = lazy(() =>
  import("@/pages/UploadPage").then((module) => ({ default: module.UploadPage }))
)
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((module) => ({ default: module.DashboardPage }))
)
const AdminPage = lazy(() =>
  import("@/pages/AdminPage").then((module) => ({ default: module.AdminPage }))
)

function App() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Suspense>
  )
}

export default App
