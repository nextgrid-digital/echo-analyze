import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

const ADMIN_ACCESS_ENABLED = import.meta.env.APP_ENABLE_ADMIN_ACCESS === "true"

export function AdminAccessToolbar() {
  if (!ADMIN_ACCESS_ENABLED) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button asChild type="button" variant="outline">
        <Link to="/admin">Admin</Link>
      </Button>
    </div>
  )
}
