"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import {
  applyPropuestaSlideFit,
  refitAllPropuestaSlides,
  resetAllPropuestaSlideFits,
} from "@/lib/propuestas/propuesta-slide-fit";

type PropuestaSlideFitProps = {
  children: ReactNode;
  center?: boolean;
  className?: string;
};

export function PropuestaSlideFit({
  children,
  center = false,
  className = "",
}: PropuestaSlideFitProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const fit = useCallback(() => {
    const host = hostRef.current;
    const stage = stageRef.current;
    if (host && stage) applyPropuestaSlideFit(host, stage);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const stage = stageRef.current;
    if (!host || !stage) return;

    fit();

    const ro = new ResizeObserver(() => fit());
    ro.observe(host);
    ro.observe(stage);

    const onBeforePrint = () => {
      requestAnimationFrame(() => {
        refitAllPropuestaSlides();
        requestAnimationFrame(refitAllPropuestaSlides);
      });
    };
    const onAfterPrint = () => resetAllPropuestaSlideFits();

    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    window.addEventListener("resize", fit);

    const mq = window.matchMedia("(max-width: 767px)");
    const onMq = () => fit();
    mq.addEventListener("change", onMq);

    return () => {
      ro.disconnect();
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      window.removeEventListener("resize", fit);
      mq.removeEventListener("change", onMq);
    };
  }, [fit, children]);

  return (
    <div
      ref={hostRef}
      data-fit-center={center ? "true" : "false"}
      className={`propuesta-fit-host flex min-h-0 w-full flex-1 overflow-hidden ${className}`}
    >
      <div ref={stageRef} className="propuesta-fit-stage w-full max-w-full shrink-0">
        {children}
      </div>
    </div>
  );
}
