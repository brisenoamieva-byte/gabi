"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { DmbLogo, DmbTagline } from "@/components/brand/DmbLogo";
import { dmbHubPath } from "@/lib/dmb/routes";

type DmbPageShellProps = {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function DmbPageShell({
  eyebrow = "Privado · DMB",
  title,
  children,
  backHref = dmbHubPath(),
  backLabel = "Volver al centro DMB",
}: DmbPageShellProps) {
  return (
    <main className="min-h-screen bg-dmb-surface text-dmb-ink">
      <header className="border-b border-dmb-line bg-white px-5 py-4 shadow-sm md:px-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={backHref}
              className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl border border-dmb-line bg-white text-dmb-ink"
              aria-label={backLabel}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-dmb-muted">
                {eyebrow}
              </p>
              <h1 className="truncate text-xl font-black md:text-2xl">{title}</h1>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <DmbLogo variant="header" href={dmbHubPath()} />
            <DmbTagline className="mt-0.5" />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-5 py-8 md:px-10">{children}</div>
    </main>
  );
}
