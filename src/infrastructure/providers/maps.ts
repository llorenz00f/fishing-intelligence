import { env } from "@/lib/env";

export type TileProvider = {
  name: string;
  styleUrl: string;
  attribution: string;
};

export function getDefaultTileProvider(): TileProvider {
  return {
    name: "OpenFreeMap",
    styleUrl: env.NEXT_PUBLIC_MAP_TILE_STYLE,
    attribution: "Map tiles by OpenFreeMap/OpenStreetMap contributors.",
  };
}
