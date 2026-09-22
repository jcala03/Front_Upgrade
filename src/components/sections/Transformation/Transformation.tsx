import { useRef, useState, type CSSProperties } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import transformationBmw from "../../../assets/images/transformation-bmw-desktop.webp";
import {
  transformationHotspots,
  type TransformationHotspot,
} from "../../../data/transformation";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";
import "./Transformation.css";

export const Transformation = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteractive, setIsInteractive] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const leadRef = useRef<HTMLParagraphElement>(null);
  const atmosphereRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const vehicleSystemRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const connectorPathRef = useRef<SVGPathElement>(null);
  const introTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const hasPlayedRef = useRef(false);
  const previousActiveIndexRef = useRef(activeIndex);
  const prefersReducedMotion = usePrefersReducedMotion();

  const reducedMotion =
    (typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) ||
    prefersReducedMotion;
  const activeHotspot = transformationHotspots[activeIndex];
  const totalHotspots = transformationHotspots.length;
  const detailId = "transformation-active-detail";
  const connectorEndX = 74;
  const connectorPath = `M ${activeHotspot.desktopX} ${activeHotspot.desktopY} L ${activeHotspot.desktopX} ${activeHotspot.connectorBendY} L ${connectorEndX} ${activeHotspot.connectorBendY}`;

  const selectHotspot = (index: number) => {
    if (isInteractive) {
      setActiveIndex(index);
    }
  };

  const selectPrevious = () => {
    if (!isInteractive) {
      return;
    }

    setActiveIndex((current) =>
      current === 0 ? totalHotspots - 1 : current - 1,
    );
  };

  const selectNext = () => {
    if (!isInteractive) {
      return;
    }

    setActiveIndex((current) =>
      current === totalHotspots - 1 ? 0 : current + 1,
    );
  };

  useGSAP(
    () => {
      const section = sectionRef.current;
      const heading = headingRef.current;
      const lead = leadRef.current;
      const atmosphere = atmosphereRef.current;
      const base = baseRef.current;
      const vehicleSystem = vehicleSystemRef.current;
      const detail = detailRef.current;
      const connectorPathElement = connectorPathRef.current;

      if (
        !section ||
        !heading ||
        !lead ||
        !atmosphere ||
        !base ||
        !vehicleSystem ||
        !detail ||
        !connectorPathElement
      ) {
        setIsInteractive(true);
        return;
      }

      let isMounted = true;
      let introCompleted = false;
      let observer: IntersectionObserver | null = null;
      const hotspots = gsap.utils.toArray<HTMLElement>(
        ".transformation__hotspot",
      );
      const hotspotRings = gsap.utils.toArray<HTMLElement>(
        ".transformation__hotspot-ring",
      );
      const activeMark = section.querySelector(
        ".transformation__hotspot.is-active .transformation__hotspot-active-mark",
      );
      const isMobile = window.matchMedia("(max-width: 760px)").matches;

      const showImmediately = () => {
        gsap.set([heading, lead, atmosphere, base, vehicleSystem, detail], {
          clearProps: "opacity,transform,visibility",
          opacity: 1,
        });
        gsap.set(isMobile ? hotspots[0] : hotspots, {
          clearProps: "opacity,transform,visibility",
          autoAlpha: 1,
        });
        if (isMobile) {
          gsap.set(hotspots.slice(1), { autoAlpha: 0 });
        }
        gsap.set(hotspotRings, { clearProps: "opacity,transform" });
        gsap.set(activeMark, {
          clearProps: "opacity,transform,visibility",
          autoAlpha: 1,
        });
        gsap.set(connectorPathElement, {
          opacity: 1,
          strokeDashoffset: 0,
        });

        hasPlayedRef.current = true;
        introCompleted = true;

        if (isMounted) {
          setIsInteractive(true);
        }
      };

      if (reducedMotion || typeof IntersectionObserver === "undefined") {
        showImmediately();

        return () => {
          isMounted = false;
        };
      }

      gsap.set(heading, { opacity: 0, y: 18 });
      gsap.set(lead, { opacity: 0, y: 14 });
      gsap.set(atmosphere, {
        opacity: 0,
        scaleX: 0.94,
        transformOrigin: "50% 50%",
      });
      gsap.set(base, {
        opacity: 0,
        scaleX: 0.78,
        transformOrigin: "50% 50%",
      });
      gsap.set(vehicleSystem, {
        opacity: isMobile ? 0.25 : 0.15,
        x: isMobile ? -36 : -64,
        y: -2,
      });
      gsap.set(hotspots, { autoAlpha: 0, pointerEvents: "none" });
      gsap.set(hotspotRings, { scale: 0.78 });
      gsap.set(activeMark, { autoAlpha: 0, scale: 0.72 });
      gsap.set(detail, { opacity: 0, y: 12 });
      gsap.set(connectorPathElement, {
        opacity: 0,
        strokeDasharray: 1,
        strokeDashoffset: 1,
      });

      const timeline = gsap.timeline({
        paused: true,
        defaults: { overwrite: "auto" },
        onComplete: () => {
          introCompleted = true;

          if (isMounted) {
            setIsInteractive(true);
          }
        },
      });

      introTimelineRef.current = timeline;

      if (isMobile) {
        timeline
          .to(heading, {
            opacity: 1,
            y: 0,
            duration: 0.36,
            ease: "power3.out",
          })
          .to(
            lead,
            {
              opacity: 1,
              y: 0,
              duration: 0.34,
              ease: "power3.out",
            },
            0.04,
          )
          .to(
            atmosphere,
            {
              opacity: 1,
              scaleX: 1,
              duration: 0.42,
              ease: "power2.out",
            },
            0.08,
          )
          .to(
            vehicleSystem,
            {
              opacity: 1,
              x: 0,
              duration: 0.58,
              ease: "power4.out",
            },
            0.18,
          )
          .to(
            base,
            {
              opacity: 1,
              scaleX: 1,
              duration: 0.36,
              ease: "power3.out",
            },
            0.36,
          )
          .to(
            hotspots[0],
            {
              autoAlpha: 1,
              pointerEvents: "auto",
              duration: 0.2,
              ease: "power2.out",
            },
            0.7,
          )
          .to(
            hotspotRings[0],
            {
              scale: 1,
              duration: 0.2,
              ease: "power2.out",
            },
            0.7,
          )
          .to(
            activeMark,
            {
              autoAlpha: 1,
              scale: 1,
              duration: 0.18,
              ease: "power2.out",
            },
            0.78,
          )
          .to(
            detail,
            {
              opacity: 1,
              y: 0,
              duration: 0.28,
              ease: "power3.out",
            },
            0.82,
          )
          .set(vehicleSystem, { y: 0 }, 0.92);
      } else {
        timeline
          .to(heading, {
            opacity: 1,
            y: 0,
            duration: 0.55,
            ease: "power3.out",
          })
          .to(
            lead,
            {
              opacity: 1,
              y: 0,
              duration: 0.5,
              ease: "power3.out",
            },
            0.08,
          )
          .to(
            atmosphere,
            {
              opacity: 1,
              scaleX: 1,
              duration: 0.62,
              ease: "power2.out",
            },
            0.12,
          )
          .to(
            vehicleSystem,
            {
              opacity: 1,
              x: 0,
              duration: 0.9,
              ease: "power4.out",
            },
            0.24,
          )
          .to(
            base,
            {
              opacity: 1,
              scaleX: 1,
              duration: 0.54,
              ease: "power3.out",
            },
            0.5,
          )
          .to(
            vehicleSystem,
            {
              y: 0,
              duration: 0.2,
              ease: "power2.out",
            },
            0.98,
          )
          .to(
            hotspots,
            {
              autoAlpha: 1,
              pointerEvents: "auto",
              duration: 0.26,
              stagger: 0.06,
              ease: "power2.out",
            },
            0.92,
          )
          .to(
            hotspotRings,
            {
              scale: 1,
              duration: 0.26,
              stagger: 0.06,
              ease: "power2.out",
            },
            0.92,
          )
          .to(
            activeMark,
            {
              autoAlpha: 1,
              scale: 1,
              duration: 0.24,
              ease: "power2.out",
            },
            1.24,
          )
          .to(
            connectorPathElement,
            {
              opacity: 1,
              strokeDashoffset: 0,
              duration: 0.28,
              ease: "power2.inOut",
            },
            1.3,
          )
          .to(
            detail,
            {
              opacity: 1,
              y: 0,
              duration: 0.36,
              ease: "power3.out",
            },
            1.34,
          );
      }

      const maximumVisibleRatio = Math.min(
        1,
        window.innerHeight / Math.max(section.offsetHeight, 1),
      );
      const observerThreshold = Math.min(0.28, maximumVisibleRatio * 0.72);

      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];

          if (!entry?.isIntersecting || hasPlayedRef.current) {
            return;
          }

          hasPlayedRef.current = true;
          observer?.disconnect();
          timeline.play(0);
        },
        { threshold: observerThreshold },
      );

      observer.observe(section);

      return () => {
        isMounted = false;
        observer?.disconnect();
        introTimelineRef.current = null;

        if (!introCompleted) {
          hasPlayedRef.current = false;
        }
      };
    },
    {
      scope: sectionRef,
      dependencies: [reducedMotion],
      revertOnUpdate: true,
    },
  );

  useGSAP(
    () => {
      const vehicleSystem = vehicleSystemRef.current;
      const atmosphere = atmosphereRef.current;
      const base = baseRef.current;
      const detail = detailRef.current;
      const connectorPathElement = connectorPathRef.current;

      if (
        !vehicleSystem ||
        !atmosphere ||
        !base ||
        !detail ||
        !connectorPathElement ||
        previousActiveIndexRef.current === activeIndex
      ) {
        return;
      }

      previousActiveIndexRef.current = activeIndex;
      const isMobile = window.matchMedia("(max-width: 760px)").matches;

      if (isMobile) {
        const hotspots = gsap.utils.toArray<HTMLElement>(
          ".transformation__hotspot",
        );
        gsap.set(hotspots, { autoAlpha: 0, pointerEvents: "none" });
        gsap.set(hotspots[activeIndex], {
          autoAlpha: 1,
          pointerEvents: "auto",
        });
      }

      if (reducedMotion) {
        gsap.set([vehicleSystem, atmosphere, base, detail], {
          clearProps: "transform,opacity",
          opacity: 1,
        });
        gsap.set(connectorPathElement, {
          opacity: 1,
          strokeDashoffset: 0,
        });
        return;
      }

      const offsetX = activeHotspot.vehicleOffsetX ?? 0;
      const offsetY = activeHotspot.vehicleOffsetY ?? 0;
      const duration = window.matchMedia("(max-width: 760px)").matches
        ? 0.26
        : 0.32;

      gsap.to(vehicleSystem, {
        x: offsetX,
        y: offsetY,
        duration,
        ease: "power3.out",
        overwrite: "auto",
      });
      gsap.to(atmosphere, {
        x: -offsetX * 0.18,
        duration,
        ease: "power3.out",
        overwrite: "auto",
      });
      gsap.to(base, {
        x: offsetX * 0.24,
        duration,
        ease: "power3.out",
        overwrite: "auto",
      });
      gsap.fromTo(
        detail,
        { opacity: 0, y: 9 },
        {
          opacity: 1,
          y: 0,
          duration,
          ease: "power2.out",
          overwrite: "auto",
        },
      );
      gsap.fromTo(
        connectorPathElement,
        { opacity: 0, strokeDashoffset: 0.22 },
        {
          opacity: 1,
          strokeDashoffset: 0,
          duration,
          ease: "power2.inOut",
          overwrite: "auto",
        },
      );
      gsap.fromTo(
        ".transformation__hotspot.is-active .transformation__hotspot-active-mark",
        { opacity: 0, scale: 0.76 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.28,
          ease: "power3.out",
          overwrite: "auto",
        },
      );
    },
    {
      scope: sectionRef,
      dependencies: [activeIndex, reducedMotion],
    },
  );

  return (
    <section
      ref={sectionRef}
      className={`section transformation ${
        isInteractive ? "is-interactive" : "is-preparing"
      }`}
      id="transformation"
      aria-labelledby="transformation-title"
    >
      <div className="container-wide transformation__inner">
        <header className="transformation__intro">
          <div ref={headingRef} className="transformation__heading">
            <p className="transformation__eyebrow">Transformación</p>
            <h2 id="transformation-title" className="transformation__title">
              La transformación está en los detalles.
            </h2>
          </div>

          <p ref={leadRef} className="transformation__lead">
            Cada decisión visual cambia la lectura completa del carro.
            Selecciona un punto y descubre cómo se construye una presencia más
            limpia, sólida y coherente.
          </p>
        </header>

        <div className="transformation__scene-frame">
          <div className="transformation__scene">
          <div
            ref={atmosphereRef}
            className="transformation__atmosphere"
            aria-hidden="true"
          />

          <div
            ref={baseRef}
            className="transformation__base"
            aria-hidden="true"
          >
            <span className="transformation__contact-shadow" />
            <span className="transformation__reflection" />
          </div>

          <div
            ref={vehicleSystemRef}
            className="transformation__vehicle-system"
          >
            <img
              className="transformation__vehicle"
              src={transformationBmw}
              alt="BMW blanco completo visto de perfil lateral"
              width={3840}
              height={2160}
              loading="eager"
              decoding="async"
              fetchPriority="low"
            />

            <div
              className="transformation__hotspots"
              aria-label="Zonas visuales del vehículo"
            >
              {transformationHotspots.map((hotspot, index) => (
                <HotspotButton
                  key={hotspot.id}
                  hotspot={hotspot}
                  isActive={index === activeIndex}
                  isDisabled={!isInteractive}
                  controlsId={detailId}
                  onSelect={() => selectHotspot(index)}
                />
              ))}
            </div>
          </div>

          <svg
            className="transformation__connector"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              ref={connectorPathRef}
              key={activeHotspot.id}
              d={connectorPath}
              pathLength="1"
            />
          </svg>

            <div ref={detailRef} className="transformation__detail">
            <div
              id={detailId}
              className="transformation__detail-content"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="transformation__detail-meta">
                <span>
                  {activeHotspot.step} /{" "}
                  {String(totalHotspots).padStart(2, "0")}
                </span>
                <small>{activeHotspot.shortLabel}</small>
              </div>

              <h3>{activeHotspot.title}</h3>
              <p>{activeHotspot.description}</p>
            </div>

            <div
              className="transformation__navigation"
              aria-label="Navegar entre zonas"
            >
              <button
                type="button"
                disabled={!isInteractive}
                onClick={selectPrevious}
                aria-label="Ver zona anterior"
              >
                <span aria-hidden="true">←</span>
                Anterior
              </button>

              <button
                type="button"
                disabled={!isInteractive}
                onClick={selectNext}
                aria-label="Ver zona siguiente"
              >
                Siguiente
                <span aria-hidden="true">→</span>
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

type HotspotButtonProps = {
  hotspot: TransformationHotspot;
  isActive: boolean;
  isDisabled: boolean;
  controlsId: string;
  onSelect: () => void;
};

const HotspotButton = ({
  hotspot,
  isActive,
  isDisabled,
  controlsId,
  onSelect,
}: HotspotButtonProps) => {
  const position = {
    "--hotspot-x-desktop": `${hotspot.desktopX}%`,
    "--hotspot-y-desktop": `${hotspot.desktopY}%`,
    "--hotspot-x-mobile": `${hotspot.mobileX}%`,
    "--hotspot-y-mobile": `${hotspot.mobileY}%`,
  } as CSSProperties;

  return (
    <button
      type="button"
      className={`transformation__hotspot ${isActive ? "is-active" : ""}`}
      style={position}
      disabled={isDisabled}
      onClick={onSelect}
      aria-label={`Explorar ${hotspot.title}`}
      aria-pressed={isActive}
      aria-controls={controlsId}
    >
      <span className="transformation__hotspot-ring" aria-hidden="true" />
      <span className="transformation__hotspot-core" aria-hidden="true" />
      <span
        className="transformation__hotspot-active-mark"
        aria-hidden="true"
      />
    </button>
  );
};
