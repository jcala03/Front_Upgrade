import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ShoppingBag } from "lucide-react";
import {
  type FocusEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import logo from "../../../assets/logos/upgrade79-logo.png";
import { useCart } from "../../../context/CartContext";
import { brand } from "../../../data/brand";
import { navigation } from "../../../data/navigation";
import { cn } from "../../../utils/cn";
import "./Header.css";

const SCROLL_DIRECTION_TOLERANCE = 10;
const TOP_VISIBILITY_THRESHOLD = 24;

export const Header = () => {
  const { totalItems } = useCart();
  const lastScrollYRef = useRef(0);
  const isHiddenRef = useRef(false);
  const [isPastHero, setIsPastHero] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);

  const updateHidden = useCallback((nextHidden: boolean) => {
    if (isHiddenRef.current === nextHidden) {
      return;
    }

    isHiddenRef.current = nextHidden;
    setIsHidden(nextHidden);
  }, []);

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".hero");

    if (!hero) {
      setIsPastHero(window.scrollY > window.innerHeight);
      return;
    }

    const updateHeroState = (pastHero: boolean) => {
      setIsPastHero((current) => (current === pastHero ? current : pastHero));

      if (!pastHero) {
        updateHidden(false);
      }
    };

    updateHeroState(hero.getBoundingClientRect().bottom <= 0);

    if (!("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      updateHeroState(
        !entry.isIntersecting && entry.boundingClientRect.bottom <= 0,
      );
    });

    observer.observe(hero);

    return () => observer.disconnect();
  }, [updateHidden]);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = Math.max(window.scrollY, 0);
      const delta = currentScrollY - lastScrollYRef.current;

      if (currentScrollY <= TOP_VISIBILITY_THRESHOLD || !isPastHero) {
        updateHidden(false);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      if (Math.abs(delta) < SCROLL_DIRECTION_TOLERANCE) {
        return;
      }

      lastScrollYRef.current = currentScrollY;

      if (hasFocusWithin) {
        updateHidden(false);
        return;
      }

      updateHidden(delta > 0);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasFocusWithin, isPastHero, updateHidden]);

  const handleFocusCapture = () => {
    setHasFocusWithin(true);
    updateHidden(false);
  };

  const handleBlurCapture = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setHasFocusWithin(false);
    }
  };

  return (
    <header
      className={cn(
        "site-header",
        isPastHero ? "site-header--past-hero" : "site-header--over-hero",
        isPastHero && "site-header--compact",
        isHidden ? "site-header--hidden" : "site-header--visible",
      )}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
    >
      <div className="site-header__inner">
        <a
          className="site-header__brand"
          href="/"
          aria-label="Volver al inicio de UP GRADE 79"
        >
          <img src={logo} alt="UP GRADE 79" />
        </a>

        <nav className="site-header__nav" aria-label="Navegación principal">
          {navigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="site-header__actions">
          <a
            className="site-header__cart"
            href="/carrito"
            aria-label={
              totalItems > 0
                ? `Ver carrito con ${totalItems} productos`
                : "Ver carrito"
            }
          >
            <ShoppingBag size={17} strokeWidth={1.8} aria-hidden="true" />

            <AnimatePresence mode="popLayout">
              {totalItems > 0 ? (
                <motion.span
                  key={totalItems}
                  initial={{ scale: 0.55, opacity: 0, y: 4 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 1.3, opacity: 0, y: -4 }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                >
                  {totalItems}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </a>

          <a
            className="site-header__cta"
            href={brand.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Cotizar upgrade automotriz por WhatsApp"
          >
            <span>Cotizar</span>
            <ArrowRight size={15} strokeWidth={1.9} aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  );
};
