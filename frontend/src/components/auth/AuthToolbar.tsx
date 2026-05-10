import {
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from "@clerk/react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

interface AuthToolbarProps {
  isAdmin?: boolean
}

export function AuthToolbar({ isAdmin = false }: AuthToolbarProps) {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {!isSignedIn ? (
        <SignInButton mode="modal">
          <Button type="button" variant="outline">
            Sign in
          </Button>
        </SignInButton>
      ) : null}
      {!isSignedIn ? (
        <SignUpButton mode="modal">
          <Button type="button">Create account</Button>
        </SignUpButton>
      ) : null}

      {isSignedIn && isAdmin ? (
        <Button asChild type="button" variant="outline">
          <Link to="/admin">Admin</Link>
        </Button>
      ) : null}
      {isSignedIn ? <UserButton /> : null}
    </div>
  )
}
