import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"

import { notifySessionStarted } from "@/api/auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth"
import { getSupabaseClient } from "@/lib/supabase/client"

type AuthMode = "sign_in" | "sign_up"

export function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isConfigured, session } = useAuth()

  const [mode, setMode] = useState<AuthMode>("sign_in")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get("next") || "/"
  }, [location.search])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setMode(params.get("mode") === "sign_up" ? "sign_up" : "sign_in")
  }, [location.search])

  useEffect(() => {
    if (session) {
      navigate(nextPath, { replace: true })
    }
  }, [navigate, nextPath, session])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!isConfigured) {
      setError("Authentication is temporarily unavailable.")
      return
    }

    if (mode === "sign_up" && password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      setError("Authentication could not be started.")
      return
    }

    setLoading(true)

    try {
      if (mode === "sign_up") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        })

        if (signUpError) {
          throw signUpError
        }

        if (data.session?.access_token) {
          await notifySessionStarted(data.session.access_token)
          navigate(nextPath, { replace: true })
          return
        }

        setMessage("Account created. Complete email verification if required, then sign in.")
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          throw signInError
        }

        if (data.session?.access_token) {
          await notifySessionStarted(data.session.access_token)
        }

        navigate(nextPath, { replace: true })
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex flex-col justify-center space-y-8">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">ECHO Access</p>
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Sign in to upload and generate reports.
              </h1>
              <p className="max-w-xl text-base text-muted-foreground">
                Upload access is restricted to authenticated users. CAS files and generated portfolio reports are not stored.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="border border-border bg-card/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Access</p>
                <p className="mt-2 text-sm">Email and password authentication for secure upload access.</p>
              </div>
              <div className="border border-border bg-card/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Compliance</p>
                <p className="mt-2 text-sm">CAS files and report output stay out of the database.</p>
              </div>
              <div className="border border-border bg-card/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Metrics</p>
                <p className="mt-2 text-sm">Only operational activity and timing metrics are tracked.</p>
              </div>
            </div>

            <Link to="/" className="text-sm text-primary underline-offset-4 hover:underline">
              Back to landing page
            </Link>
          </section>

          <Card className="border-border/70 bg-card/80 backdrop-blur">
            <CardHeader className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === "sign_in" ? "default" : "outline"}
                  onClick={() => setMode("sign_in")}
                  className="flex-1"
                >
                  Sign in
                </Button>
                <Button
                  type="button"
                  variant={mode === "sign_up" ? "default" : "outline"}
                  onClick={() => setMode("sign_up")}
                  className="flex-1"
                >
                  Sign up
                </Button>
              </div>
              <div>
                <CardTitle>{mode === "sign_in" ? "Welcome back" : "Create an account"}</CardTitle>
                <CardDescription>
                  {mode === "sign_in"
                    ? "Use your email and password to continue."
                    : "Create your account to unlock secure report uploads."}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email"
                    autoComplete="email"
                    required
                  />
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
                    required
                  />
                  {mode === "sign_up" && (
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      required
                    />
                  )}
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {message && (
                  <Alert>
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={loading} className="w-full min-h-[48px]">
                  {loading
                    ? "Please wait..."
                    : mode === "sign_in"
                      ? "Sign in"
                      : "Create account"}
                </Button>

                {!isConfigured && (
                  <p className="text-xs text-muted-foreground">
                    Authentication is currently unavailable.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
