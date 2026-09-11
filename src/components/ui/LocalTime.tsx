"use client";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
function format(timestamp: string, timeZone?: string) {
  return Number.isFinite(Date.parse(timestamp)) ? new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(timestamp)) : "N/D";
}

export function LocalTime({ timestamp }: { timestamp: string }) {
  // Hydrate the UTC server output before switching to the device's time zone.
  const label = useSyncExternalStore(subscribe, () => format(timestamp), () => format(timestamp, "UTC"));
  return <time dateTime={timestamp || undefined}>{label}</time>;
}
