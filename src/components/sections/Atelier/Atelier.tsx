import { ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { useEffect, useRef } from "react";
import atelierFitmentVideo from "../../../assets/videos/atelier-fitment-loop.mp4";
import { Reveal } from "../../ui/Reveal";
import "./Atelier.css";

const process = [
  {
    number: "01",
    title: "Inspección visual",
    description: "Revisamos proporción, líneas y presencia.",
    icon: ShieldCheck,
  },
  {
    number: "02",
    title: "Ajuste & fitment",
    description: "Buscamos que cada pieza se integre limpia.",
    icon: Wrench,
  },
  {
    number: "03",
    title: "Acabado premium",
    description: "El resultado debe verse exclusivo y sólido.",
    icon: Sparkles,
  },
];

export const Atelier = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;

    if (!section || !video) {
      return;
    }

    const playVideo = () => {
      void video.play().catch(() => {
        // Muted autoplay may still be declined by device-level policies.
      });
    };

    if (!("IntersectionObserver" in window)) {
      hasStartedRef.current = true;
      playVideo();

      return () => video.pause();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!hasStartedRef.current && entry.intersectionRatio >= 0.18) {
          hasStartedRef.current = true;
          playVideo();
          return;
        }

        if (!hasStartedRef.current) {
          return;
        }

        if (!entry.isIntersecting || entry.intersectionRatio <= 0.04) {
          video.pause();
          return;
        }

        playVideo();
      },
      { threshold: [0, 0.04, 0.18] },
    );

    observer.observe(section);

    return () => {
      observer.disconnect();
      video.pause();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="section atelier"
      id="atelier"
      aria-labelledby="atelier-title"
    >
      <div className="container-wide atelier__inner">
        <Reveal>
          <div
            className="atelier__visual"
            id="services"
            aria-label="Proceso de fitment automotriz"
          >
            <video
              ref={videoRef}
              className="atelier__video"
              src={atelierFitmentVideo}
              muted
              playsInline
              preload="metadata"
              loop
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>
        </Reveal>

        <div className="atelier__copy">
          <Reveal delay={0.08}>
            <span className="section-kicker">Atelier</span>

            <h2 className="atelier__title" id="atelier-title">
              <span>Que parezca original.</span>
              <span>
                Que se sienta exclusivo
                <i aria-hidden="true" />
              </span>
            </h2>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="atelier__description">
              En UP GRADE 79 cuidamos cada detalle del fitment, la postura y la
              selección de componentes para que tu vehículo mantenga elegancia,
              pero gane carácter.
            </p>
          </Reveal>

          <Reveal delay={0.22}>
            <div className="atelier__process" aria-label="Proceso premium">
              {process.map((item) => {
                const Icon = item.icon;

                return (
                  <article key={item.number} className="atelier__process-card">
                    <strong>{item.number}</strong>

                    <Icon size={30} strokeWidth={1.45} aria-hidden="true" />

                    <div>
                      <span>{item.title}</span>
                      <p>{item.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
