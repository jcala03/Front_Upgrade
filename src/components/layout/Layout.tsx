import { type ReactNode, useEffect } from "react";
import { SmoothScroll } from "../effects/SmoothScroll";
import { Header } from "./Header";
import { Footer } from "./Footer";

type LayoutProps = {
  children: ReactNode;
  pathname?: string;
};

export const Layout = ({ children, pathname = typeof window === "undefined" ? "/" : window.location.pathname }: LayoutProps) => {
  useEffect(() => {
    // A cross-page anchor arrives before React has rendered its target section.
    const target = document.getElementById(window.location.hash.slice(1));
    if (!target) return;
    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start", behavior: "instant" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <SmoothScroll>
      <div className="main-shell" id="top">
        <div className="noise-layer" aria-hidden="true" />
        <Header pathname={pathname} />
        {children}
        <Footer pathname={pathname} />
      </div>
    </SmoothScroll>
  );
};
