import type { ImgHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface EchoLogoProps extends ImgHTMLAttributes<HTMLImageElement> {
  size?: number
}

export function EchoLogo({ className, size = 32, ...props }: EchoLogoProps) {
  return (
    <img
      src="/echo-logo.svg"
      alt="ECHO"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-md", className)}
      {...props}
    />
  )
}
