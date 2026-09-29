import React from "react";

export interface StripedProgressBarProps {
  value: number; // 0 to 100
  color?: "emerald" | "blue" | "pink" | "amber" | "cyan" | "white";
  height?: string; // e.g. "h-2", "h-2.5", "h-3"
  className?: string; // Container track custom classes
  barClassName?: string; // Bar custom classes
}

const colorClassMap: Record<string, string> = {
  emerald: "bg-striped-emerald",
  blue: "bg-striped-blue",
  pink: "bg-striped-pink",
  amber: "bg-striped-amber",
  cyan: "bg-striped-cyan",
  white: "bg-striped-white",
};

/**
 * Candy-Striped Diagonal Progress Bar
 * Replaces plain/simple progress bars with a vibrant hatched diagonal style.
 */
export function StripedProgressBar({
  value,
  color = "emerald",
  height = "h-2.5",
  className = "",
  barClassName = "",
}: StripedProgressBarProps) {
  const clampedValue = Math.min(Math.max(value, value > 0 ? 5 : 0), 100);

  return (
    <div
      className={`w-full ${height} bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/60 ${className}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-700 ${colorClassMap[color] || colorClassMap.emerald} ${barClassName}`}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
