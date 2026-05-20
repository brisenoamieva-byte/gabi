"use client";

import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { getDemoBookingUrl } from "@/lib/site/demo-booking";

type ScheduleDemoButtonProps = {
  variant?: "hero" | "nav" | "footer" | "link";
  className?: string;
  showIcon?: boolean;
  label?: string;
  scrollToEmbed?: boolean;
};

const variantClasses: Record<NonNullable<ScheduleDemoButtonProps["variant"]>, string> = {
  hero:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-gabi-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-gabi-navy-light active:scale-[0.99]",
  nav: "hidden text-sm font-medium text-gabi-navy/60 transition hover:text-gabi-navy sm:inline-flex",
  footer:
    "inline-flex items-center gap-2 rounded-lg bg-gabi-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-gabi-navy-light",
  link: "font-medium text-gabi-teal underline-offset-2 hover:underline",
};

export function ScheduleDemoButton({
  variant = "hero",
  className = "",
  showIcon = false,
  label = "Agendar demo",
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
    <Link href={bookingUrl} target="_blank" rel="noopener noreferrer" className={classes}>
      {showIcon ? <CalendarDays className="h-4 w-4 shrink-0" /> : null}
      {label}
    </Link>
  );
}
