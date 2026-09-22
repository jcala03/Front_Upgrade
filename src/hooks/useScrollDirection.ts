import { useEffect, useState } from "react";

export type ScrollDirection = "up" | "down";

export const useScrollDirection = () => {
  const [direction, setDirection] = useState<ScrollDirection>("up");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const currentY = window.scrollY;
      setIsScrolled(currentY > 20);

      if (Math.abs(currentY - lastY) > 8) {
        setDirection(currentY > lastY ? "down" : "up");
        lastY = currentY;
      }

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return { direction, isScrolled };
};
