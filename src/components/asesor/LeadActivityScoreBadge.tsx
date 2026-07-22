"use client";

import { formatLeadActivityScoreDetail } from "@/lib/comercial/lead-activity-score";

type LeadActivityScoreBadgeProps = {
  score: number | null | undefined;
  detail?: Array<{ id: string; label: string; points: number }> | null;
  size?: "sm" | "md";
};

export function LeadActivityScoreBadge({
  score,
  detail,
  size = "sm",
}: LeadActivityScoreBadgeProps) {
  if (score == null || Number.isNaN(score)) {
    return null;
  }

  const title = formatLeadActivityScoreDetail(detail);
  const sizeClass =
    size === "md"
      ? "px-2.5 py-1 text-xs"
      : "px-2 py-0.5 text-[10px]";

  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-[#201044]/[0.08] font-bold tabular-nums text-[#201044] ${sizeClass}`}
    >
      <span className="opacity-60">Score</span>
      {score}
    </span>
  );
}
