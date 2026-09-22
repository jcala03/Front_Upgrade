import { Instagram, MessageCircle, Play } from "lucide-react";
import { brand } from "../../../data/brand";
import { navigation } from "../../../data/navigation";
import { Marquee } from "../../ui/Marquee";
import "./Footer.css";

export const Footer = () => {
  return (
    <footer className="footer">
      <Marquee text="BODY KITS · FACE LIFT · RS STYLE · AMG STYLE · M STYLE · UP GRADE 79 · AUTOMOTIVE UPGRADING" />

      <div className="footer__inner container-wide">
        <div className="footer__brand">
          <a className="footer__logo" href="#projects" aria-label="Volver al inicio">
            <span>UP GRADE</span>
            <strong>79</strong>
          </a>
          <p>Construimos presencia. No solo accesorios.</p>
          <div className="footer__socials" aria-label="Redes sociales">
            <a href={brand.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram">
              <Instagram size={20} strokeWidth={1.5} aria-hidden="true" />
            </a>
            <a href={brand.whatsappUrl} target="_blank" rel="noreferrer" aria-label="WhatsApp">
              <MessageCircle size={20} strokeWidth={1.5} aria-hidden="true" />
            </a>
            <a href={brand.instagramUrl} target="_blank" rel="noreferrer" aria-label="Ver contenido de UP GRADE 79">
              <Play size={18} strokeWidth={1.5} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="footer__columns">
          <div>
            <span>Navegación</span>
            {navigation.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </div>
          <div>
            <span>Contacto</span>
            <a href={brand.whatsappUrl} target="_blank" rel="noreferrer" aria-label="Contactar por WhatsApp">
              {brand.phone}
            </a>
            <a href={brand.instagramUrl} target="_blank" rel="noreferrer" aria-label="Abrir Instagram de UP GRADE 79">
              Instagram
            </a>
            <p>{brand.location}</p>
          </div>
        </div>
      </div>

      <div className="footer__bottom container-wide">
        <span>{brand.name}</span>
        <span>2026 · Automotive Upgrading</span>
      </div>
    </footer>
  );
};
