export type CustomerVehicleOption = {
  id: number;
  display_name: string;
  nickname: string | null;
  brand: { id: number; name: string } | null;
  model: { id: number; name: string } | null;
  version: { id: number; name: string } | null;
  year: number | null;
  plate: string | null;
};

export type CustomerOption = {
  id: number;
  name: string;
  contact: {
    phone: string | null;
    email: string | null;
    document: string | null;
  };
  vehicles: CustomerVehicleOption[];
};

export type ServiceOption = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  estimated_duration_minutes: number;
  category: { id: number; name: string } | null;
};

export type CustomerOptionsResponse = { data: CustomerOption[] };
export type ServiceOptionsResponse = { data: ServiceOption[] };
