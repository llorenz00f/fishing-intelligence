import { cookies } from "next/headers";
import { forecastLocationCookie, parseForecastLocation } from "@/domain/forecast/location";
import { requireAccount } from "@/infrastructure/supabase/account";
export async function getForecastLocation() {
  const { profile } = await requireAccount();
  return parseForecastLocation((await cookies()).get(`${forecastLocationCookie}-${profile.id}`)?.value) ?? profile.homeLocation;
}
