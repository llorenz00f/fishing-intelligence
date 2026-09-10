import type { DisciplineCode, LocationPoint, TechniqueCode } from "@/types/product";
import type { EnvironmentSnapshot } from "@/domain/forecast/types";

export type SessionOutcome = "NONE" | "STRIKES" | "CATCHES";

export type SessionEventType = "STRIKE" | "CATCH" | "SPOT_CHANGE" | "NOTE" | "PHOTO";

export type SessionEvent = {
  id: string;
  clientId: string;
  sessionId: string;
  type: SessionEventType;
  timestamp: string;
  location?: LocationPoint;
  note?: string;
  synced: boolean;
};

export type CatchRecord = {
  id: string;
  sessionId: string;
  species: string;
  timestamp: string;
  location?: LocationPoint;
  estimatedWeightKg?: number;
  measuredWeightKg?: number;
  lengthCm?: number;
  baitOrLure?: string;
  depthM?: number;
  released: boolean;
  notes?: string;
  photoUrl?: string;
};

export type FishingSession = {
  id: string;
  userId: string;
  discipline: DisciplineCode;
  technique: TechniqueCode;
  targetSpecies?: string;
  startTime: string;
  endTime?: string;
  startLocation: LocationPoint;
  endLocation?: LocationPoint;
  primarySpot?: string;
  notes?: string;
  outcome: SessionOutcome;
  rating?: number;
  weatherSnapshot?: EnvironmentSnapshot;
  finalEnvironmentSnapshot?: EnvironmentSnapshot;
  catches: CatchRecord[];
  events: SessionEvent[];
  conditionScore?: number;
};
