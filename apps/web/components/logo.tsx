import { cn } from "@/lib/utils"

interface LogoMarkProps {
  className?: string
  size?: number
}

/**
 * Marca OptiCloud AI
 * Dois losangos concêntricos — externo com bordas arredondadas,
 * interno menor rotacionado 45°. Glifo único, fechado, coeso.
 * Funciona em qualquer fundo sem depender de variáveis de cor.
 */
export function LogoMark({ className, size = 32 }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* Losango externo — stroke arredondado */}
      <path
        d="M16 3 L29 16 L16 29 L3 16 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Losango interno menor — preenchido */}
      <path
        d="M16 11 L21 16 L16 21 L11 16 Z"
        fill="currentColor"
      />
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
      <div
        className="flex items-center justify-center rounded-lg bg-primary shrink-0"
        style={{ width: iconSize, height: iconSize }}
      >
        <LogoMark
          size={Math.round(iconSize * 0.68)}
          className="text-primary-foreground"
        />
      </div>

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
