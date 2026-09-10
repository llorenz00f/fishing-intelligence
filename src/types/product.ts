export type DisciplineCode = "SURFCASTING" | "SHORE_SPINNING" | "BOAT" | "SPEARFISHING";

export type TechniqueCode =
  | "STANDARD_SURFCASTING"
  | "BEACH_LEDGERING"
  | "SHORE_SPINNING"
  | "ROCK_SPINNING"
  | "EGING"
  | "DRIFTING"
  | "TROLLING"
  | "LIVE_BAIT"
  | "VERTICAL_JIGGING"
  | "SLOW_PITCH"
  | "BOTTOM_FISHING"
  | "SPEAR_AMBUSH"
  | "SPEAR_STALKING"
  | "SPEAR_CAVE"
  | "SPEAR_DROP";

export type PressureTrend =
  | "RAPIDLY_FALLING"
  | "FALLING"
  | "STABLE"
  | "RISING"
  | "RAPIDLY_RISING";

export type SubscriptionPlan = "FREE" | "PRO" | "CAPTAIN";

export type LocationPoint = {
  latitude: number;
  longitude: number;
  label?: string;
};

export type Species = {
  code: string;
  commonName: string;
  scientificName?: string;
};

export type Discipline = {
  code: DisciplineCode;
  label: string;
};

export type Technique = {
  code: TechniqueCode;
  discipline: DisciplineCode;
  label: string;
};
