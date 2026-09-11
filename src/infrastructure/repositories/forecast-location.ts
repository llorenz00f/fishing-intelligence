import { cookies } from "next/headers";
import { forecastLocationCookie, parseForecastLocation } from "@/domain/forecast/location";
import { demoLocation } from "@/data/demo";
export async function getForecastLocation() {
  return parseForecastLocation((await cookies()).get(forecastLocationCookie)?.value) ?? demoLocation;
}
