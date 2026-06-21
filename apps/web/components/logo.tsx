import { cn } from "@/lib/utils"

interface LogoMarkProps {
  className?: string
  size?: number
}

export function LogoMark({ className, size = 32 }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <polygon points="480,256 368,62 144,62 32,256 144,450 368,450" fill="currentColor" />
      <path
        d="M270.9,140.6 C261.4,92.3 219.0,56 168,56 C127.5,56 92.4,79.0 74.9,112.6 C32.8,117.0 0,152.7 0,196 C0,242.3 37.7,280 84,280 L266,280 C306.6,280 336,249.4 336,210 C336,173.0 291.3,143.1 270.9,140.6 Z"
        fill="currentColor"
        stroke="white"
        strokeWidth="22"
        strokeLinejoin="round"
        strokeLinecap="round"
        transform="translate(88,92)"
        style={{ paintOrder: "stroke fill" }}
      />
      <polygon points="256,196 302,242 256,288 210,242" fill="white" />
    </svg>
  )
}

interface LogoProps {
  className?: string
  iconSize?: number
  showText?: boolean
  variant?: "sidebar" | "default"
}

export function Logo({
  className,
  iconSize = 32,
  showText = true,
  variant = "sidebar",
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <LogoMark
        size={iconSize}
        className="text-primary shrink-0"
      />
      {showText && (
        <span
          className={cn(
            "font-semibold tracking-tight leading-none",
            variant === "sidebar"
              ? "text-[13px] text-sidebar-foreground"
              : "text-sm text-foreground"
          )}
        >
          OptiCloud<span className="text-primary font-bold"> AI</span>
        </span>
      )}
    </div>
  )
}
