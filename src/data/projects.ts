export type Project = {
  id: string;
  vehicle: string;
  title: string;
  summary: string;
  category: string;
  result: string;
  image?: string;
  tags: string[];
};

export const projects: Project[] = [
  {
    id: "audi-rs-front",
    vehicle: "Audi A4",
    title: "Frente RS Style con presencia más agresiva.",
    summary:
      "Actualización visual enfocada en parrilla, frente y detalles exteriores para lograr una apariencia más deportiva sin perder elegancia.",
    category: "Parrilla · Frente · Detalles exteriores",
    result: "Frente más dominante y apariencia premium.",
    tags: ["Parrilla RS", "Exterior", "Fitment"],
  },
  {
    id: "bmw-interior-screen",
    vehicle: "BMW",
    title: "Interior upgrade con pantalla y acabado moderno.",
    summary:
      "Mejora interior pensada para elevar la experiencia visual y tecnológica dentro del vehículo.",
    category: "Pantalla · Interior · Tecnología",
    result: "Cabina más moderna, limpia y funcional.",
    tags: ["Pantallas", "Interior", "Premium"],
  },
  {
    id: "mercedes-visual-kit",
    vehicle: "Mercedes-Benz",
    title: "Kit visual para una línea más exclusiva.",
    summary:
      "Selección de piezas exteriores para reforzar la presencia del vehículo y darle una estética más refinada.",
    category: "Body kit · Accesorios · Detalles",
    result: "Look más exclusivo y mejor presencia en calle.",
    tags: ["Body kit", "Exterior", "OEM+"],
  },
  {
    id: "toyota-prado-upgrade",
    vehicle: "Toyota Prado",
    title: "Conversión visual con carácter más actual.",
    summary:
      "Trabajo de actualización estética para mejorar la percepción del vehículo y hacerlo ver más moderno.",
    category: "Conversión · Luces · Accesorios",
    result: "Imagen renovada y presencia más fuerte.",
    tags: ["Conversión", "Luces", "Upgrade"],
  },
];
