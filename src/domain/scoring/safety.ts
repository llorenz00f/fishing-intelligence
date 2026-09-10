import type { FishingScoreInput, SafetyAssessment } from "@/domain/scoring/types";

export function assessSafety(input: FishingScoreInput): SafetyAssessment {
  const warnings: string[] = [];
  const waveHeight = input.environment.marine.waveHeightM ?? 0;
  const swellHeight = input.environment.marine.swellHeightM ?? 0;
  const windSpeed = input.environment.weather.windSpeedKph ?? 0;
  const gust = input.environment.weather.windGustKph ?? windSpeed;
  const current = input.environment.marine.oceanCurrentVelocityMps ?? 0;

  if (waveHeight >= 2.2 || swellHeight >= 2) {
    warnings.push("Mare previsto importante: consulta fonti ufficiali e condizioni locali prima di uscire.");
  }

  if (windSpeed >= 32 || gust >= 45) {
    warnings.push("Vento o raffiche elevate possono rendere difficili rientro, lancio e gestione dell'attrezzatura.");
  }

  if (current >= 0.65 && input.discipline === "SPEARFISHING") {
    warnings.push("Corrente sostenuta prevista: per apnea e scogliere serve prudenza aggiuntiva.");
  }

  if (input.discipline === "BOAT" && (waveHeight >= 1.4 || windSpeed >= 25)) {
    warnings.push("Per la barca le condizioni previste richiedono verifica con bollettini nautici ufficiali.");
  }

  if (input.discipline === "SPEARFISHING" && (waveHeight >= 1 || swellHeight >= 0.9)) {
    warnings.push("Per pesca subacquea le condizioni marine previste possono ridurre visibilita e controllo.");
  }

  if (warnings.length >= 2) {
    return { level: "HIGH", warnings, suppressGoCta: true };
  }

  if (warnings.length === 1) {
    return { level: "MODERATE", warnings, suppressGoCta: true };
  }

  return { level: "LOW", warnings, suppressGoCta: false };
}
