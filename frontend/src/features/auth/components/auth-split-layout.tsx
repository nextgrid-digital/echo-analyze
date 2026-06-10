import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AuthBrandPanel } from "./auth-brand-panel"

interface AuthSplitLayoutProps {
  children: ReactNode
  topLink?: { href: string; label: string }
}

export function AuthSplitLayout({ children, topLink }: AuthSplitLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      {topLink && (
        <Link
          to={topLink.href}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "absolute top-4 right-4 hidden md:top-8 md:right-8"
          )}
        >
          {topLink.label}
        </Link>
      )}
      <AuthBrandPanel />
      <div className="flex h-full items-center justify-center p-4 lg:p-8">
        <div className="flex w-full max-w-md flex-col items-center justify-center space-y-6">
          {children}
        </div>
      </div>
    </div>
  )
}
