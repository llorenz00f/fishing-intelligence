import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserForecast } from "@/application/services/user-forecast";
import { getAccount } from "@/infrastructure/supabase/account";
import { canUseFeature } from "@/domain/account/access";
import { apiError, privateJson } from "@/lib/api";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  label: z.string().trim().min(1).max(100).optional(),
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
  days: z.coerce.number().int().min(1).max(14).default(7),
});

export async function GET(request: Request) {
  try {
  const account = await getAccount();
  if (!account) return privateJson({ error: "Accedi per consultare le previsioni." }, 401);
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid forecast request", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.days > 7 && !canUseFeature(account.profile, "ADVANCED_FORECAST")) return privateJson({ error: "Le previsioni estese richiedono PRO." }, 403);
  const forecast = await getUserForecast({
      latitude: parsed.data.lat,
      longitude: parsed.data.lng,
      label: parsed.data.label,
    }, parsed.data.discipline, parsed.data.technique, parsed.data.species, parsed.data.days);

  return privateJson(forecast);
  } catch (error) { return apiError(error); }
}
