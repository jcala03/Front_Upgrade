import baseImage from "../assets/images/transformation-bmw-desktop.webp";

// Only packaged photographs are used: absent assets never become broken URLs
// or simulated upgrades. All five frames must use the same car and alignment.
const photographs = import.meta.glob<string>(
  "../assets/images/transformation-states/*.webp",
  { eager: true, query: "?url", import: "default" },
);

export const transformationBaseImage = baseImage;
export const transformationVisuals = [
  { id: "front", file: "transformation-front.webp" },
  { id: "front-wheel", file: "transformation-front-wheel.webp" },
  { id: "side", file: "transformation-side.webp" },
  { id: "roof", file: "transformation-roof.webp" },
  { id: "rear-wheel", file: "transformation-rear.webp" },
].map((visual) => {
  const photo = photographs[`../assets/images/transformation-states/${visual.file}`];
  return { ...visual, src: photo ?? baseImage, available: Boolean(photo) };
});

export const transformationAssetsRequired = transformationVisuals.some((visual) => !visual.available);
