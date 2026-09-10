import type { BathymetryProvider } from "@/infrastructure/providers/types";
import type { LocationPoint } from "@/types/product";

export class EmodnetBathymetryProvider implements BathymetryProvider {
  name = "emodnet-bathymetry";

  async getDepthAtLocation(location: LocationPoint) {
    void location;
    return null;
  }
}
