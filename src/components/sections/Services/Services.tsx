import { services } from "../../../data/services";
import { Reveal } from "../../ui/Reveal";
import { ServiceCard } from "../../ui/ServiceCard";
import "./Services.css";

export const Services = () => {
  return (
    <section className="section services" id="services" aria-labelledby="services-title">
      <div className="container services__inner">
        <div className="services__header">
          <Reveal>
            <span className="section-kicker">Services</span>
            <h2 className="section-title" id="services-title">
              Upgrade real. Presencia real.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="section-copy">
              Piezas, conversión visual, fitment y acabado. Todo se trabaja para que el carro se vea más ancho, más actual y más premium.
            </p>
          </Reveal>
        </div>

        <div className="services__grid">
          {services.map((service, index) => (
            <ServiceCard service={service} index={index} key={service.title} />
          ))}
        </div>
      </div>
    </section>
  );
};
