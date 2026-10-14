import places from "./places.json";
import type { Option } from "@/components/Combobox";

export type CityRow = { id: string; name: string };
export type ChurchRow = { id: string; name: string; city_id: string | null };

// Demo mode lists (ids are the names)
export const demoCities: CityRow[] = places.cities.map((n) => ({ id: n, name: n }));
export const demoChurches: ChurchRow[] = places.churches.map((c) => ({ id: c.name, name: c.name, city_id: c.city }));

export const cityOptions = (cities: CityRow[]): Option[] => cities.map((c) => ({ id: c.id, label: c.name, hint: "Texas" }));

export const churchOptions = (churches: ChurchRow[], cities: CityRow[]): Option[] => {
  const byId = new Map(cities.map((c) => [c.id, c.name]));
  return churches.map((c) => ({ id: c.id, label: c.name, hint: c.city_id ? byId.get(c.city_id) : undefined }));
};
