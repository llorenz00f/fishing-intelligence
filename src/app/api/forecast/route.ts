import { NextResponse } from "next/server";
import { z } from "zod";
import { ForecastService } from "@/application/services/forecast-service";
import { createProviderBundle } from "@/infrastructure/providers/provider-factory";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  label: z.string().optional(),
  discipline: z.enum(["SURFCASTING", "SHORE_SPINNING", "BOAT", "SPEARFISHING"]).default("SHORE_SPINNING"),
  technique: z
    .enum([
      "STANDARD_SURFCASTING",
      "BEACH_LEDGERING",
      "SHORE_SPINNING",
      "ROCK_SPINNING",
      "EGING",
      "DRIFTING",
      "TROLLING",
      "LIVE_BAIT",
      "VERTICAL_JIGGING",
      "SLOW_PITCH",
      "BOTTOM_FISHING",
      "SPEAR_AMBUSH",
      "SPEAR_STALKING",
      "SPEAR_CAVE",
      "SPEAR_DROP",
    ])
    .default("SHORE_SPINNING"),
  species: z.string().optional(),
  days: z.coerce.number().min(1).max(7).default(7),
});

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid forecast request", details: parsed.error.flatten() }, { status: 400 });
  }

  const service = new ForecastService(createProviderBundle());
  const forecast = await service.getForecast({
    location: {
      latitude: parsed.data.lat,
      longitude: parsed.data.lng,
      label: parsed.data.label,
    },
    discipline: parsed.data.discipline,
    technique: parsed.data.technique,
    species: parsed.data.species,
    start: new Date().toISOString(),
    days: parsed.data.days,
  });

  return NextResponse.json(forecast);
}
