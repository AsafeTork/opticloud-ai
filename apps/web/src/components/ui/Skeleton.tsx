"use client";

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl bg-[#1A1D27] border border-[#2A2D3E] animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ width = "w-full", height = "h-4" }: { width?: string; height?: string }) {
  return (
    <div className={`${width} ${height} rounded bg-[#2A2D3E] animate-pulse`} aria-hidden="true" />
  );
}

export function SkeletonKpiGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <SkeletonCard key={i} className="h-32" />
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return <SkeletonCard className="h-72" />;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonCard key={i} className="h-16" />
      ))}
    </div>
  );
}
