import { brand } from "../data/brand";

export const getWhatsappUrl = (message?: string) => {
  if (!message) return brand.whatsappUrl;

  return `https://wa.me/573236293543?text=${encodeURIComponent(message)}`;
};
