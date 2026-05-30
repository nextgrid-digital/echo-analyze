import { useState, type FormEvent } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/auth/useAuth"
import { cn } from "@/lib/utils"

interface AuthPanelProps {
  className?: string
}

export function AuthPanel({ className }: AuthPanelProps) {
  const { configured, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isSignUp = mode === "sign-up"

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (isSignUp) {
        await signUp(email, password, username)
        setMessage("Account created. Check your inbox if email confirmation is enabled.")
      } else {
        await signIn(email, password)
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Authentication failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>{isSignUp ? "Create account" : "Sign in"}</CardTitle>
        <CardDescription>ECHO portfolio analyzer</CardDescription>
      </CardHeader>
      <CardContent>
        {!configured ? (
          <Alert variant="destructive">
            <AlertDescription>
              Supabase environment variables are missing or invalid.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block" title="Coming soon">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled
                    aria-label="Continue with Google, coming soon"
                  >
                    Continue with Google
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">Coming soon</TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {isSignUp && (
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="username">
                    Username
                  </label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  minLength={6}
                  required
                />
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

              <div className="flex flex-col gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    setMode(isSignUp ? "sign-in" : "sign-up")
                    setError(null)
                    setMessage(null)
                  }}
                >
                  {isSignUp ? "Already have an account?" : "Create an account"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AuthPage() {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md items-center">
        <AuthPanel />
      </div>
    </div>
  )
}
