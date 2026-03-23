import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AdminRoute, ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AuthPage } from "@/pages/AuthPage"
import { AdminPage } from "@/pages/AdminPage"
import { UploadPage } from "@/pages/UploadPage"
import { DashboardPage } from "@/pages/DashboardPage"
import "./App.css"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
