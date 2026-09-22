import { type ReactNode, useEffect } from "react";
import Lenis from "@studio-freight/lenis";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";

type SmoothScrollProps = {
  children: ReactNode;
};

export const SmoothScroll = ({ children }: SmoothScrollProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.25,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.2,
    });

    let frame = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      frame = window.requestAnimationFrame(raf);
    };

    frame = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [prefersReducedMotion]);

  return <>{children}</>;
};
