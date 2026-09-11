import type { CSSProperties } from "react";

export function waveGeometry(heightM?: number, periodSec?: number) {
  const known = typeof heightM === "number" && Number.isFinite(heightM) && heightM >= 0;
  const amplitude = known ? Math.min(27, Math.max(1, heightM * 10)) : 0;
  const period = typeof periodSec === "number" && Number.isFinite(periodSec) && periodSec > 0 ? Math.max(4, Math.min(20, periodSec)) : 8;
  let path = "M0 40";
  // Two identical 360-unit tiles make the end of each animation match its start.
  for (let x = 0; x < 720; x += 180) {
    path += ` C${x + 30} ${40 - amplitude},${x + 60} ${40 - amplitude},${x + 90} 40 C${x + 120} ${40 + amplitude},${x + 150} ${40 + amplitude},${x + 180} 40`;
  }
  return { known, amplitude, period, path, fill: `${path} L720 80 L0 80 Z` };
}

export function MarineWave({ heightM, periodSec }: { heightM?: number; periodSec?: number }) {
  const wave = waveGeometry(heightM, periodSec);
  return <div className="wave-line" data-wave-height={wave.known ? heightM : "N/D"} data-wave-known={wave.known} data-wave-amplitude={wave.amplitude}
    style={{ "--wave-speed": `${wave.period * 2}s`, "--wave-back-speed": `${wave.period * 2.6}s` } as CSSProperties} aria-hidden="true">
    <svg className="wave-track wave-track--back" viewBox="0 0 720 80" preserveAspectRatio="none"><path className="wave-fill" d={wave.fill} /><path className="wave-crest" d={wave.path} /></svg>
    <svg className="wave-track" viewBox="0 0 720 80" preserveAspectRatio="none"><path className="wave-fill" d={wave.fill} /><path className="wave-crest" d={wave.path} /></svg>
  </div>;
}
