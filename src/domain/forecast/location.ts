import { z } from "zod";
export const forecastLocationCookie = "fi-forecast-location";
export const forecastLocationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  label: z.string().trim().min(1).max(100),
});
export function parseForecastLocation(value?: string) {
  try { return forecastLocationSchema.parse(JSON.parse(decodeURIComponent(value ?? ""))); } catch { return null; }
}
export function saveForecastLocation(location: z.infer<typeof forecastLocationSchema>) {
  const data = forecastLocationSchema.parse(location);
  document.cookie = `${forecastLocationCookie}=${encodeURIComponent(JSON.stringify(data))};path=/;max-age=2592000;SameSite=Lax${locationIsSecure() ? ";Secure" : ""}`;
}
function locationIsSecure() { return window.location.protocol === "https:"; }
