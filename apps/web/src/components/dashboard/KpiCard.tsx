"use client";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: string;
  accent?: "primary" | "success" | "warning" | "danger" | "default";
  trend?: { value: number; label: string };
}

const accentMap = {
  primary: "text-[#0066FF]",
  success: "text-[#00D4AA]",
  warning: "text-[#FFB800]",
  danger:  "text-[#FF4757]",
  default: "text-[#E5E7EB]",
} as const;

const trendColor = (v: number) =>
  v > 0 ? "text-[#FF4757]" : v < 0 ? "text-[#00D4AA]" : "text-[#6B7280]";

export function KpiCard({ label, value, sub, icon, accent = "default", trend }: KpiCardProps) {
  return (
    <article
      className="rounded-xl border border-[#2A2D3E] bg-[#1A1D27]/80 backdrop-blur-md p-6
                 hover:border-[#3A3D4E] hover:bg-[#222535] transition-all duration-200
                 focus-within:ring-2 focus-within:ring-[#0066FF]"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-[#9CA3AF]">{label}</p>
        {icon && <span className="text-lg" aria-hidden="true">{icon}</span>}
      </div>
      <p className={`text-3xl font-bold tracking-tight ${accentMap[accent]}`}>{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {sub && <p className="text-xs text-[#6B7280]">{sub}</p>}
        {trend && (
          <span className={`text-xs font-medium ${trendColor(trend.value)}`}>
            {trend.value > 0 ? "↑" : trend.value < 0 ? "↓" : "→"} {Math.abs(trend.value)}% {trend.label}
          </span>
        )}
      </div>
    </article>
  );
}
