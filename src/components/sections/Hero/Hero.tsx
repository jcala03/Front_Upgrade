import { useEffect, useRef } from "react";
import heroVideo from "../../../assets/videos/hero-upgrade-desktop.mp4";
import { brand } from "../../../data/brand";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";
import "./Hero.css";

export const Hero = () => {
  const reducedMotion = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (reducedMotion) {
      video.pause();
      return;
    }

    void video.play().catch(() => {
      // Autoplay can still be declined by browser or device-level policies.
    });
  }, [reducedMotion]);

  return (
    <section className="hero" id="projects" aria-labelledby="hero-title">
      <video
        ref={videoRef}
        className="hero__video"
        src={heroVideo}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className="hero__overlays" aria-hidden="true" />

      <div className="container-wide hero__inner">
        <div className="hero__copy">
          <p className="hero__eyebrow">
            Personalización automotriz en Barranquilla
          </p>

          <h1 id="hero-title" className="hero__title">
            <span className="hero__title-line hero__title-line--soft">
              Tu carro.
            </span>
            <strong className="hero__title-line hero__title-line--strong">
              Otra presencia.
            </strong>
          </h1>

          <p className="hero__description">
            Tecnología, diseño y transformación automotriz para hacer único
            cada detalle.
          </p>

          <div className="hero__actions">
            <a className="hero__cta hero__cta--primary" href="/tienda">
              Explorar artículos
              <span aria-hidden="true">↗</span>
            </a>

            <a
              className="hero__cta hero__cta--secondary"
              href={brand.whatsappUrl}
              target="_blank"
              rel="noreferrer"
            >
              Cotizar transformación
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
