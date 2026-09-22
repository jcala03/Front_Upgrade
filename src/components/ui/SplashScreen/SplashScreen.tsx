import { useId, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import logo from "../../../assets/logos/upgrade79-logo-hq.png";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";
import "./SplashScreen.css";

gsap.registerPlugin(useGSAP);

type SplashScreenProps = {
  onComplete: () => void;
};

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const scope = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const logoImageRef = useRef<HTMLImageElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const instanceId = useId().replace(/:/g, "");
  const svgIds = {
    trackTexture: `${instanceId}-track-texture`,
    trackFade: `${instanceId}-track-fade`,
    upperTrackMask: `${instanceId}-upper-track-mask`,
    lowerTrackMask: `${instanceId}-lower-track-mask`,
    streakGradient: `${instanceId}-streak-gradient`,
    streakDistortion: `${instanceId}-streak-distortion`,
    smokeTexture: `${instanceId}-smoke-texture`,
    smokeFill: `${instanceId}-smoke-fill`,
  };

  useGSAP(
    () => {
      let cancelled = false;
      let removeImageListeners = () => {};

      const reducedMotion =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        prefersReducedMotion;

      const logoElement = logoRef.current;
      const logoImage = logoImageRef.current;
      const backdropElement = backdropRef.current;
      const splashElement = scope.current;

      if (!logoElement || !logoImage || !backdropElement || !splashElement) {
        if (!cancelled) {
          onComplete();
        }
        return;
      }

      const finish = () => {
        if (!cancelled) {
          onComplete();
        }
      };

      const startTimeline = () => {
        if (cancelled) {
          return;
        }

        if (reducedMotion) {
          gsap.set(".splash__effects", { display: "none" });

          gsap
            .timeline({ onComplete: finish })
            .to(logoElement, {
              opacity: 1,
              duration: 0.08,
              ease: "power1.out",
            })
            .to(
              [logoElement, backdropElement],
              {
                opacity: 0,
                duration: 0.14,
                ease: "power1.out",
              },
              0.1,
            )
            .set(splashElement, { pointerEvents: "none" }, 0.24);

          return;
        }

        const exitDistance = () => {
          const logoWidth = logoElement.getBoundingClientRect().width;
          const screenWidth = window.screen?.width ?? 0;
          const screenHeight = window.screen?.height ?? 0;
          const defensiveViewport = Math.max(
            window.innerWidth,
            screenWidth,
            screenHeight,
          );

          return defensiveViewport * 1.75 + logoWidth + 140;
        };

        gsap.set(logoElement, {
          opacity: 0,
          x: 0,
          rotation: 0,
        });
        gsap.set(".splash__track-reveal", {
          attr: { width: 0 },
        });
        gsap.set(".splash__streak", {
          opacity: 0,
          scaleX: 0.06,
          x: -18,
          transformOrigin: "0% 50%",
        });
        gsap.set(".splash__smoke-form", {
          opacity: 0,
          scale: 0.72,
          x: 16,
          y: 8,
          transformOrigin: "50% 50%",
        });

        gsap
          .timeline({
            defaults: { overwrite: "auto" },
            onComplete: finish,
          })
          .to(logoElement, {
            opacity: 1,
            duration: 0.22,
            ease: "power2.out",
          })
        .to(logoElement, {
          x: -7,
          duration: 0.09,
          ease: "power2.inOut",
        }, 0.6)
        .to(logoElement, {
          x: -5.5,
          rotation: 0.16,
          duration: 0.035,
          ease: "none",
        }, 0.69)
        .to(logoElement, {
          x: -7.5,
          rotation: -0.12,
          duration: 0.035,
          ease: "none",
        }, 0.725)
        .to(logoElement, {
          x: -6,
          rotation: 0,
          duration: 0.035,
          ease: "none",
        }, 0.76)
        .to(".splash__streak", {
          opacity: 0.52,
          scaleX: 1,
          x: 0,
          duration: 0.34,
          ease: "power3.in",
        }, 0.7)
        .to(".splash__track-reveal--upper", {
          attr: { width: 960 },
          duration: 0.38,
          ease: "power3.inOut",
        }, 0.78)
        .to(".splash__track-reveal--lower", {
          attr: { width: 940 },
          duration: 0.4,
          ease: "power3.inOut",
        }, 0.805)
        .to(".splash__smoke-form--one", {
          opacity: 0.2,
          scale: 1,
          x: -22,
          y: -12,
          duration: 0.34,
          ease: "power2.out",
        }, 0.8)
        .to(".splash__smoke-form--two", {
          opacity: 0.14,
          scale: 1.08,
          x: -38,
          y: -22,
          duration: 0.38,
          ease: "power2.out",
        }, 0.84)
        .to(".splash__smoke-form--three", {
          opacity: 0.11,
          scale: 1.12,
          x: -50,
          y: -8,
          duration: 0.4,
          ease: "power2.out",
        }, 0.88)
        .to(logoElement, {
          x: exitDistance,
          duration: 0.46,
          ease: "expo.in",
        }, 0.76)
        .to(backdropElement, {
          opacity: 0,
          duration: 0.4,
          ease: "power2.out",
        }, 1)
        .to(".splash__streak", {
          opacity: 0,
          scaleX: 1.12,
          duration: 0.38,
          ease: "power2.out",
        }, 1.08)
        .to(".splash__tracks", {
          opacity: 0,
          duration: 0.54,
          ease: "power2.out",
        }, 1.1)
        .to(".splash__smoke", {
          opacity: 0,
          x: -28,
          duration: 0.5,
          ease: "power2.out",
        }, 1.12)
          .set(splashElement, { pointerEvents: "none" }, 1.4);
      };

      const waitForImage = async () => {
        if (!logoImage.complete) {
          await new Promise<void>((resolve) => {
            const settle = () => {
              removeImageListeners();
              resolve();
            };

            removeImageListeners = () => {
              logoImage.removeEventListener("load", settle);
              logoImage.removeEventListener("error", settle);
            };

            logoImage.addEventListener("load", settle, { once: true });
            logoImage.addEventListener("error", settle, { once: true });
          });
        }

        if (cancelled) {
          return;
        }

        if (typeof logoImage.decode === "function" && logoImage.naturalWidth > 0) {
          try {
            await logoImage.decode();
          } catch {
            // A failed decode falls back to the browser's loaded image state.
          }
        }

        if (!cancelled) {
          startTimeline();
        }
      };

      void waitForImage();

      return () => {
        cancelled = true;
        removeImageListeners();
      };
    },
    {
      scope,
      dependencies: [onComplete, prefersReducedMotion],
      revertOnUpdate: true,
    },
  );

  return (
    <div ref={scope} className="splash" aria-hidden="true">
      <div ref={backdropRef} className="splash__backdrop" />

      <div className="splash__effects" aria-hidden="true">
        <svg
          className="splash__tracks"
          viewBox="0 0 1600 360"
          preserveAspectRatio="none"
        >
          <defs>
            <filter
              id={svgIds.trackTexture}
              x="-8%"
              y="-35%"
              width="116%"
              height="170%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.025 0.19"
                numOctaves="1"
                seed="79"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="7"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>

            <linearGradient id={svgIds.trackFade} x1="0" x2="1">
              <stop offset="0" stopColor="white" stopOpacity="0" />
              <stop offset="0.12" stopColor="white" stopOpacity="0.72" />
              <stop offset="0.62" stopColor="white" stopOpacity="0.45" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>

            <mask id={svgIds.upperTrackMask}>
              <rect
                className="splash__track-reveal splash__track-reveal--upper"
                x="575"
                y="0"
                width="0"
                height="360"
                fill={`url(#${svgIds.trackFade})`}
              />
            </mask>

            <mask id={svgIds.lowerTrackMask}>
              <rect
                className="splash__track-reveal splash__track-reveal--lower"
                x="575"
                y="0"
                width="0"
                height="360"
                fill={`url(#${svgIds.trackFade})`}
              />
            </mask>
          </defs>

          <g
            mask={`url(#${svgIds.upperTrackMask})`}
            filter={`url(#${svgIds.trackTexture})`}
          >
            <path
              className="splash__track-stroke"
              d="M575 155 C690 148 770 161 884 151 S1090 147 1198 158 S1380 151 1535 157"
            />
            <path
              className="splash__track-breaks"
              d="M605 153 C710 148 792 161 905 152 S1124 148 1250 159 S1402 150 1510 156"
            />
          </g>

          <g
            mask={`url(#${svgIds.lowerTrackMask})`}
            filter={`url(#${svgIds.trackTexture})`}
          >
            <path
              className="splash__track-stroke splash__track-stroke--lower"
              d="M575 210 C674 217 784 202 894 214 S1086 218 1210 207 S1405 219 1535 211"
            />
            <path
              className="splash__track-breaks splash__track-breaks--lower"
              d="M610 211 C718 218 805 203 925 214 S1112 216 1248 208 S1410 218 1518 211"
            />
          </g>
        </svg>

        <svg
          className="splash__streak"
          viewBox="0 0 880 180"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={svgIds.streakGradient} x1="1" x2="0">
              <stop offset="0" stopColor="#f8fafc" stopOpacity="0.5" />
              <stop offset="0.22" stopColor="#cbd5e1" stopOpacity="0.22" />
              <stop offset="0.7" stopColor="#94a3b8" stopOpacity="0.05" />
              <stop offset="1" stopColor="#94a3b8" stopOpacity="0" />
            </linearGradient>
            <filter
              id={svgIds.streakDistortion}
              x="-4%"
              y="-24%"
              width="108%"
              height="148%"
            >
              <feTurbulence
                type="turbulence"
                baseFrequency="0.012 0.11"
                numOctaves="1"
                seed="19"
                result="streakNoise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="streakNoise"
                scale="5"
              />
            </filter>
          </defs>
          <g filter={`url(#${svgIds.streakDistortion})`}>
            <path
              d="M10 83 C205 75 410 72 870 54 L870 92 C515 94 260 91 10 96 Z"
              fill={`url(#${svgIds.streakGradient})`}
            />
            <path
              d="M90 111 C310 103 538 106 820 99"
              fill="none"
              stroke={`url(#${svgIds.streakGradient})`}
              strokeWidth="3"
            />
            <path
              d="M150 58 C370 57 592 49 778 38"
              fill="none"
              stroke={`url(#${svgIds.streakGradient})`}
              strokeWidth="2"
            />
          </g>
        </svg>

        <svg className="splash__smoke" viewBox="0 0 520 300">
          <defs>
            <filter
              id={svgIds.smokeTexture}
              x="-22%"
              y="-30%"
              width="144%"
              height="160%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.018"
                numOctaves="2"
                seed="7"
                result="smokeNoise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="smokeNoise"
                scale="24"
                result="distortedSmoke"
              />
              <feGaussianBlur in="distortedSmoke" stdDeviation="5.5" />
            </filter>
            <radialGradient id={svgIds.smokeFill}>
              <stop offset="0" stopColor="#cbd5e1" stopOpacity="0.65" />
              <stop offset="0.5" stopColor="#64748b" stopOpacity="0.24" />
              <stop offset="1" stopColor="#334155" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g filter={`url(#${svgIds.smokeTexture})`}>
            <path
              className="splash__smoke-form splash__smoke-form--one"
              d="M214 171 C174 146 189 105 232 111 C241 72 310 70 322 116 C364 113 383 151 352 179 C316 209 256 204 214 171Z"
              fill={`url(#${svgIds.smokeFill})`}
            />
            <path
              className="splash__smoke-form splash__smoke-form--two"
              d="M117 185 C85 153 111 120 151 126 C166 90 220 101 225 137 C267 145 261 188 225 202 C189 220 145 214 117 185Z"
              fill={`url(#${svgIds.smokeFill})`}
            />
            <path
              className="splash__smoke-form splash__smoke-form--three"
              d="M36 207 C13 180 38 150 71 158 C84 131 130 139 135 169 C166 174 162 208 137 222 C103 238 59 233 36 207Z"
              fill={`url(#${svgIds.smokeFill})`}
            />
          </g>
        </svg>
      </div>

      <div ref={logoRef} className="splash__logo-wrap">
        <img ref={logoImageRef} className="splash__logo" src={logo} alt="" />
      </div>
    </div>
  );
};
