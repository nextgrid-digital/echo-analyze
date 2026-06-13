import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "@/auth/useAuth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { getAuthRedirectPath, withAuthRedirect } from "@/lib/authRedirect"

export type AuthFormMode = "sign-in" | "sign-up"

interface AuthFormProps {
  mode: AuthFormMode
}

export function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectPath = getAuthRedirectPath(searchParams)
  const { configured, loading: authLoading, user, signIn, signInWithGoogle, signUp } =
    useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isSignUp = mode === "sign-up"
  const alternatePath = isSignUp
    ? withAuthRedirect("/sign-in", redirectPath)
    : withAuthRedirect("/sign-up", redirectPath)

  useEffect(() => {
    if (user) {
      navigate(redirectPath, { replace: true })
    }
  }, [navigate, redirectPath, user])

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

  async function handleGoogleSignIn() {
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      await signInWithGoogle(redirectPath)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Google sign-in failed.")
      setLoading(false)
    }
  }

  if (authLoading && !configured) {
    return <p className="text-sm text-muted-foreground">Loading sign-in...</p>
  }

  if (!configured) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Supabase environment variables are missing or invalid.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isSignUp ? "Create an account" : "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isSignUp
            ? "Enter your details to get started with ECHO"
            : "Enter your credentials to sign in to your account"}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={loading}
        onClick={() => void handleGoogleSignIn()}
      >
        {loading ? "Opening Google..." : "Continue with Google"}
      </Button>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs uppercase text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {isSignUp && (
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
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
          <Label htmlFor="email">Email</Label>
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
          <Label htmlFor="password">Password</Label>
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

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <Link to={alternatePath} className="font-medium text-primary hover:underline">
          {isSignUp ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </div>
  )
}
