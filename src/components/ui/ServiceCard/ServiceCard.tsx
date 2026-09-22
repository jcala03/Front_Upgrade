import {
  BadgeCheck,
  CircleDot,
  Grid2X2,
  PackageCheck,
  PanelsTopLeft,
  ScanLine,
  Settings2,
  Sparkles,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { type Service, type ServiceIcon } from "../../../data/services";
import "./ServiceCard.css";

const iconMap: Record<ServiceIcon, LucideIcon> = {
  panels: PanelsTopLeft,
  scan: ScanLine,
  badge: BadgeCheck,
  settings: Settings2,
  grill: Grid2X2,
  bumper: Waves,
  wheel: CircleDot,
  sparkle: Sparkles,
  package: PackageCheck,
};

type ServiceCardProps = {
  service: Service;
  index: number;
};

export const ServiceCard = ({ service, index }: ServiceCardProps) => {
  const Icon = iconMap[service.icon];

  return (
    <motion.article
      className="service-card"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.6, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8 }}
    >
      <div className="service-card__number">{String(index + 1).padStart(2, "0")}</div>
      <div className="service-card__icon" aria-hidden="true">
        <Icon size={22} strokeWidth={1.45} />
      </div>
      <h3>{service.title}</h3>
      <p>{service.description}</p>
    </motion.article>
  );
};
