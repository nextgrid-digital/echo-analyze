import { Link } from "react-router-dom"
import { MarketingLayout } from "@/components/MarketingLayout"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <MarketingLayout>
      <section className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Page not found</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link to="/">Back to home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/demo">Book a demo</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  )
}
