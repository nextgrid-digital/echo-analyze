import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ArrowRightIcon, PhoneCallIcon } from "lucide-react"

export function HeroSection() {
  return (
    <section className="mx-auto w-full max-w-5xl overflow-hidden pt-16">
      <div className="flex max-w-2xl flex-col gap-5 px-4">
        <Link
          className={cn(
            "group flex w-fit items-center gap-3 rounded-sm border bg-card p-1 shadow-xs",
            "fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards transition-all delay-500 duration-500 ease-out"
          )}
          to="/demo"
        >
          <div className="rounded-xs border bg-card px-1.5 py-0.5 shadow-sm">
            <p className="font-mono text-xs">NEW</p>
          </div>

          <span className="text-xs">portfolio intelligence for advisors</span>
          <span className="block h-5 border-l" />

          <div className="pr-1">
            <ArrowRightIcon className="size-3 -translate-x-0.5 duration-150 ease-out group-hover:translate-x-0.5" />
          </div>
        </Link>

        <h1
          className={cn(
            "text-balance font-medium text-4xl leading-tight text-foreground md:text-5xl",
            "fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-100 duration-500 ease-out"
          )}
        >
          Grow with confidence.
        </h1>

        <p
          className={cn(
            "text-sm tracking-wider text-muted-foreground sm:text-lg md:text-xl",
            "fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-200 duration-500 ease-out"
          )}
        >
          Portfolio intelligence for modern wealth advisors.
          <br />
          Benchmark every holding, prepare every review, and act faster.
        </p>

        <div className="fade-in slide-in-from-bottom-10 flex w-fit animate-in items-center justify-center gap-3 fill-mode-backwards pt-2 delay-300 duration-500 ease-out">
          <Button variant="outline" asChild>
            <Link to="/demo">
              <PhoneCallIcon data-icon="inline-start" />
              Book a demo
            </Link>
          </Button>
          <Button asChild>
            <Link to="/sign-in">
              Sign in
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>
      <div className="relative">
        <div
          className={cn(
            "mask-b-from-60% relative mt-8 -mr-56 overflow-hidden px-2 sm:mt-12 sm:mr-0 md:mt-20",
            "fade-in slide-in-from-bottom-5 animate-in fill-mode-backwards delay-100 duration-1000 ease-out"
          )}
        >
          <div className="relative inset-shadow-2xs inset-shadow-foreground/10 mx-auto max-w-5xl overflow-hidden rounded-lg border bg-background p-2 shadow-xl ring-1 ring-card dark:inset-shadow-foreground/20 dark:inset-shadow-xs">
            <img
              alt="Echo advisor dashboard"
              className="z-2 aspect-video rounded-lg border dark:hidden"
              height={1080}
              src="https://storage.efferd.com/screen/dashboard-light.webp"
              width={1920}
            />
            <img
              alt="Echo advisor dashboard"
              className="hidden aspect-video rounded-lg bg-background dark:block"
              height={1080}
              src="https://storage.efferd.com/screen/dashboard-dark.webp"
              width={1920}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
