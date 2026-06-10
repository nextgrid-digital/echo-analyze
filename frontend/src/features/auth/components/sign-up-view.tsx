import { Link } from "react-router-dom"
import { AuthForm } from "./auth-form"
import { AuthSplitLayout } from "./auth-split-layout"

export function SignUpView() {
  return (
    <AuthSplitLayout topLink={{ href: "/sign-in", label: "Sign in" }}>
      <AuthForm mode="sign-up" />
      <div className="space-y-2 px-8 text-center text-xs text-muted-foreground">
        <p>
          Explore pricing and plans on the{" "}
          <Link to="/pricing" className="underline underline-offset-4 hover:text-primary">
            pricing page
          </Link>
          .
        </p>
      </div>
      <p className="px-8 text-center text-sm text-muted-foreground">
        By clicking continue, you agree to our{" "}
        <Link to="/terms" className="underline underline-offset-4 hover:text-primary">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link to="/privacy" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </Link>
        .
      </p>
    </AuthSplitLayout>
  )
}
