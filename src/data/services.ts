export type ServiceIcon =
  | "panels"
  | "scan"
  | "badge"
  | "settings"
  | "grill"
  | "bumper"
  | "wheel"
  | "sparkle"
  | "package";

export type Service = {
  title: string;
  description: string;
  icon: ServiceIcon;
};

export const services: Service[] = [
  {
    title: "Body Kits",
    description: "Piezas visuales que elevan proporción, postura y presencia.",
    icon: "panels",
  },
  {
    title: "Face Lift",
    description: "Renovación frontal y posterior con apariencia más actual.",
    icon: "scan",
  },
  {
    title: "Conversión RS / AMG / M Style",
    description: "Líneas deportivas inspiradas en acabados de alto desempeño.",
    icon: "badge",
  },
  {
    title: "Piezas tipo OEM",
    description: "Integración limpia con ajuste preciso y acabado natural.",
    icon: "settings",
  },
  {
    title: "Parrillas deportivas",
    description: "Frentes más agresivos sin perder elegancia visual.",
    icon: "grill",
  },
  {
    title: "Bumpers",
    description: "Volúmenes renovados para una presencia más dominante.",
    icon: "bumper",
  },
  {
    title: "Rines",
    description: "Selección visual para mejorar postura, carácter y acabado.",
    icon: "wheel",
  },
  {
    title: "Detailing exterior",
    description: "Corrección, protección y brillo para un cierre premium.",
    icon: "sparkle",
  },
  {
    title: "Accesorios premium",
    description: "Detalles que transforman la actitud final del vehículo.",
    icon: "package",
  },
];
