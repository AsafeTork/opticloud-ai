import { cn } from "@/lib/utils"

interface LogoMarkProps {
  className?: string
  size?: number
}

export function LogoMark({ className, size = 32 }: LogoMarkProps) {
  return (
    <img
      src="/opticloud-logo.png"
      alt="OptiCloud AI"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      draggable={false}
    />
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
      <LogoMark size={iconSize} />
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
