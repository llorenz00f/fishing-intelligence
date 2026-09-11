import type { DisciplineCode, LocationPoint } from "@/types/product";

export type SpotView = {
  id: string;
  name: string;
  location: LocationPoint;
  discipline?: DisciplineCode;
  notes?: string;
};
