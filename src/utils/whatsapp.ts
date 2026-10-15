import { brand } from "../data/brand";

export const getWhatsappUrl = (message?: string) => {
  if (!message) return brand.whatsappUrl;

  return `https://wa.me/57302 3887034?text=${encodeURIComponent(message)}`;
};
