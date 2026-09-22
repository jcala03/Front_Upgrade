export type TransformationHotspot = {
  id: string;
  step: string;
  title: string;
  shortLabel: string;
  description: string;
  desktopX: number;
  desktopY: number;
  mobileX: number;
  mobileY: number;
  connectorBendY: number;
  vehicleOffsetX?: number;
  vehicleOffsetY?: number;
};

export const transformationHotspots: TransformationHotspot[] = [
  {
    id: "front",
    step: "01",
    title: "Frente y ópticas",
    shortLabel: "Lectura frontal",
    description:
      "Las ópticas y el volumen delantero concentran la primera lectura del carro y definen su expresión visual.",
    desktopX: 86.5,
    desktopY: 43.5,
    mobileX: 86.5,
    mobileY: 43.5,
    connectorBendY: 34,
    vehicleOffsetX: -8,
  },
  {
    id: "front-wheel",
    step: "02",
    title: "Rin delantero y postura",
    shortLabel: "Proporción",
    description:
      "El rin delantero y el espacio dentro del guardabarros influyen directamente en la postura del conjunto.",
    desktopX: 78.2,
    desktopY: 55.5,
    mobileX: 78.2,
    mobileY: 55.5,
    connectorBendY: 31,
    vehicleOffsetX: -5,
    vehicleOffsetY: -1,
  },
  {
    id: "side",
    step: "03",
    title: "Línea lateral",
    shortLabel: "Continuidad visual",
    description:
      "La continuidad entre puertas, cintura y parte baja determina qué tan limpia y sólida se percibe la silueta.",
    desktopX: 51,
    desktopY: 44.5,
    mobileX: 51,
    mobileY: 44.5,
    connectorBendY: 27,
  },
  {
    id: "roof",
    step: "04",
    title: "Silueta superior",
    shortLabel: "Perfil",
    description:
      "La relación entre techo, cristales y pilares construye el perfil superior y equilibra el peso visual del carro.",
    desktopX: 47,
    desktopY: 25,
    mobileX: 47,
    mobileY: 25,
    connectorBendY: 18,
    vehicleOffsetX: 2,
    vehicleOffsetY: 2,
  },
  {
    id: "rear-wheel",
    step: "05",
    title: "Rin trasero y cierre",
    shortLabel: "Balance posterior",
    description:
      "El rin trasero y el remate de la carrocería completan la proporción lateral y cierran visualmente el conjunto.",
    desktopX: 28,
    desktopY: 55.5,
    mobileX: 28,
    mobileY: 55.5,
    connectorBendY: 23,
    vehicleOffsetX: 8,
    vehicleOffsetY: -1,
  },
];
