"use client";

import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { getDemoBookingUrl } from "@/lib/site/demo-booking";

type ScheduleDemoButtonProps = {
  variant?: "primary" | "outline" | "header" | "footer" | "link";
  className?: string;
  showIcon?: boolean;
  label?: string;
  scrollToEmbed?: boolean;
};

const variantClasses: Record<NonNullable<ScheduleDemoButtonProps["variant"]>, string> = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-full border border-[#2DD4BF]/40 bg-[#2DD4BF]/10 px-6 py-4 text-base font-bold text-[#13315C] transition hover:bg-[#2DD4BF]/20",
  outline:
    "inline-flex items-center justify-center gap-2 rounded-full border border-[#13315C]/15 bg-white px-4 py-2.5 text-sm font-bold text-[#13315C] transition hover:bg-[#F1F5F9]",
  header:
    "hidden rounded-full border border-[#13315C]/15 bg-white px-4 py-2.5 text-sm font-bold text-[#13315C] transition hover:bg-[#F1F5F9] sm:inline-flex items-center gap-2",
  footer:
    "inline-flex items-center gap-2 rounded-full bg-gabi-teal px-7 py-4 text-base font-black text-gabi-navy shadow-lg transition hover:bg-gabi-teal/85 active:scale-[0.98]",
  link: "font-bold text-[#2DD4BF] underline-offset-2 hover:underline",
};

export function ScheduleDemoButton({
  variant = "primary",
  className = "",
  showIcon = true,
  label = "Agendar una demo",
  scrollToEmbed = false,
}: ScheduleDemoButtonProps) {
  const bookingUrl = getDemoBookingUrl();
  const classes = `${variantClasses[variant]} ${className}`.trim();

  if (scrollToEmbed) {
    return (
      <a href="#agendar-demo" className={classes}>
        {showIcon ? <CalendarDays className="h-4 w-4 shrink-0" /> : null}
        {label}
      </a>
    );
  }

  if (variant === "link") {
    return (
      <Link href={bookingUrl} target="_blank" rel="noopener noreferrer" className={classes}>
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={classes}
    >
      {showIcon ? <CalendarDays className="h-4 w-4 shrink-0" /> : null}
      {label}
    </Link>
  );
}
