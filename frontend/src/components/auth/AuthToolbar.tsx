import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export function AuthToolbar() {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button asChild type="button" variant="outline">
        <Link to="/admin">Admin</Link>
      </Button>
    </div>
  )
}
