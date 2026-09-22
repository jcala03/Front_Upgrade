import { type ReactNode } from "react";
import { SmoothScroll } from "../effects/SmoothScroll";
import { Header } from "./Header";
import { Footer } from "./Footer";

type LayoutProps = {
  children: ReactNode;
};

export const Layout = ({ children }: LayoutProps) => {
  return (
    <SmoothScroll>
      <div className="main-shell" id="top">
        <div className="noise-layer" aria-hidden="true" />
        <Header />
        {children}
        <Footer />
      </div>
    </SmoothScroll>
  );
};
