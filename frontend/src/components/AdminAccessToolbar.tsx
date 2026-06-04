import { Link } from "react-router-dom"
import { useAuth } from "@/auth/useAuth"
import { Button } from "@/components/ui/button"

export function AdminAccessToolbar() {
  const { isAdmin, signOut, username } = useAuth()

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <span className="text-sm text-muted-foreground">{username}</span>
      {isAdmin && (
        <Button asChild type="button" variant="outline">
          <Link to="/admin">Admin</Link>
        </Button>
      )}
      <Button asChild type="button" variant="outline">
        <Link to="/pricing">Pricing</Link>
      </Button>
      <Button type="button" variant="outline" onClick={() => void signOut()}>
        Sign out
      </Button>
    </div>
  )
}
