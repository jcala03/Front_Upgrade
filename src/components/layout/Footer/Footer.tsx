import { Instagram, MessageCircle, Play } from "lucide-react";
import { brand } from "../../../data/brand";
import { navigation } from "../../../data/navigation";
import logo from "../../../assets/logos/upgrade79-logo.png";
import innovativeOnlineIndustriesLogo from "../../../assets/logos/innovative-online-industries.jpeg";
import { Marquee } from "../../ui/Marquee";
import "./Footer.css";
import { openPrivacyPreferences } from "../../../privacy/consent";
import { privacyControlsEnabled, publicLegalPaths, legalDocumentTitle } from "../../../privacy/config";

export const Footer = ({ pathname = "/" }: { pathname?: string }) => {
  return (
    <footer className="footer">
      <Marquee text="BODY KITS · FACE LIFT · RS STYLE · AMG STYLE · M STYLE · UP GRADE 79 · AUTOMOTIVE UPGRADING" />

      <div className="footer__inner container-wide">
        <div className="footer__brand">
          <a className="footer__logo" href="/" aria-label="Volver al inicio">
            <img src={logo} alt="UP GRADE 79" width={150} height={150} loading="lazy" decoding="async" />
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
              <a key={item.href} href={pathname === "/" ? item.href : `/${item.href}`}>
                {item.label}
              </a>
            ))}
            <a className="footer__employees" href="/login">Empleados</a>
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
            {privacyControlsEnabled ? <button className="footer__privacy" type="button" onClick={openPrivacyPreferences}>Configurar cookies</button> : null}
          </div>
        </div>
      </div>

      {publicLegalPaths().length ? <nav className="footer__legal container-wide" aria-label="Información legal">
        {publicLegalPaths().map(path => <a key={path} href={path}>{legalDocumentTitle(path.slice(1))}</a>)}
        {!publicLegalPaths().includes("/terminos-y-condiciones") ? <a href="/terminos-y-condiciones">Términos y Condiciones</a> : null}
      </nav> : ["/", "/politica-de-datos", "/terminos-y-condiciones"].includes(pathname) ? (
        <nav className="footer__legal container-wide" aria-label="Información legal">
          <a href="/politica-de-datos">Política de Tratamiento de Datos</a>
          <a href="/terminos-y-condiciones">Términos y Condiciones</a>
        </nav>
      ) : null}
      {import.meta.env.DEV ? <nav className="footer__legal container-wide" aria-label="Revisión legal local"><a href="/__legal-review/legal-y-privacidad">Revisar borradores legales (solo local)</a></nav> : null}
      <div className="footer__bottom container-wide">
        <span>{brand.name}</span>
        <span>2026 · Automotive Upgrading</span>
      </div>

      <div className="footer__credit container-wide">
        <img
          className="footer__credit-logo"
          src={innovativeOnlineIndustriesLogo}
          alt=""
          width={1080}
          height={462}
          loading="lazy"
          decoding="async"
        />
        <span>Powered by Innovative Online Industries</span>
      </div>
    </footer>
  );
};
