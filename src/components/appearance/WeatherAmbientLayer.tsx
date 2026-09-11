"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { useAppearance } from "./ThemeProvider";

function RainEffect({ heavy, reduced }: { heavy: boolean; reduced: boolean }) {
  const count = reduced ? 6 : heavy ? 28 : 16;
  return <div className="ambient-rain">{Array.from({ length: count }, (_, index) => <i key={index} style={{ "--drop-x": `${(index * 37 + 11) % 100}%`, "--drop-delay": `${-(index * 1.7)}s`, "--drop-duration": `${3.8 + index % 4}s` } as CSSProperties} />)}</div>;
}
function StormEffect() {
  const light = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let animation: Animation | undefined;
    function schedule() {
      timer = setTimeout(() => {
        if (!document.hidden) animation = light.current?.animate([{ opacity: 0 }, { opacity: .065, offset: .25 }, { opacity: 0 }], { duration: 1100, easing: "ease-out" });
        schedule();
      }, 32_000 + Math.random() * 43_000);
    }
    schedule();
    return () => { clearTimeout(timer); animation?.cancel(); };
  }, []);
  return <div ref={light} className="ambient-storm" />;
}
function MistEffect() { return <div className="ambient-mist" />; }
function SolarGlow({ twilight }: { twilight: boolean }) { return <div className={twilight ? "ambient-solar ambient-twilight" : "ambient-solar"} />; }

export function WeatherAmbientLayer() {
  const { preferences, reducedMotion, weather } = useAppearance();
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  if (preferences.themeId !== "dynamic-weather" || preferences.ambientEffectIntensity === "off" || weather.weatherState === "neutral" || pathname === "/map" || pathname.endsWith("/live") || !visible) return null;
  const reduced = reducedMotion || preferences.ambientEffectIntensity === "reduced";
  const operational = !["/dashboard", "/forecast", "/profile/appearance"].includes(pathname);
  const effects = weather.ambientEffects;
  return <div className="weather-ambient" data-testid="weather-ambient" data-weather={weather.weatherState} data-reduced={reduced} data-intensity={preferences.ambientEffectIntensity} data-operational={operational} aria-hidden="true">
    {effects.includes("rain") ? <RainEffect heavy={weather.weatherState === "heavy-rain" || weather.weatherState === "thunderstorm"} reduced={reduced} /> : null}
    {effects.includes("clouds") ? <div className="ambient-clouds" /> : null}
    {effects.includes("fog") ? <MistEffect /> : null}
    {effects.includes("sun-glow") || weather.timeOfDay === "sunrise" || weather.timeOfDay === "sunset" ? <SolarGlow twilight={weather.timeOfDay === "sunrise" || weather.timeOfDay === "sunset"} /> : null}
    {effects.includes("wind") ? <div className="ambient-current"><i /><i /><i /></div> : null}
    {effects.includes("lightning") && !reduced && !operational ? <StormEffect /> : null}
  </div>;
}
