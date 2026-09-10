import type { Discipline, Species, Technique } from "@/types/product";

export const disciplines: Discipline[] = [
  { code: "SURFCASTING", label: "Surfcasting" },
  { code: "SHORE_SPINNING", label: "Spinning da costa" },
  { code: "BOAT", label: "Barca" },
  { code: "SPEARFISHING", label: "Pesca subacquea" },
];

export const techniques: Technique[] = [
  { code: "STANDARD_SURFCASTING", discipline: "SURFCASTING", label: "Surfcasting standard" },
  { code: "BEACH_LEDGERING", discipline: "SURFCASTING", label: "Beach ledgering" },
  { code: "SHORE_SPINNING", discipline: "SHORE_SPINNING", label: "Shore spinning" },
  { code: "ROCK_SPINNING", discipline: "SHORE_SPINNING", label: "Rock spinning" },
  { code: "EGING", discipline: "SHORE_SPINNING", label: "Eging" },
  { code: "DRIFTING", discipline: "BOAT", label: "Drifting" },
  { code: "TROLLING", discipline: "BOAT", label: "Traina" },
  { code: "LIVE_BAIT", discipline: "BOAT", label: "Vivo" },
  { code: "VERTICAL_JIGGING", discipline: "BOAT", label: "Vertical jigging" },
  { code: "SLOW_PITCH", discipline: "BOAT", label: "Slow pitch" },
  { code: "BOTTOM_FISHING", discipline: "BOAT", label: "Bolentino" },
  { code: "SPEAR_AMBUSH", discipline: "SPEARFISHING", label: "Aspetto" },
  { code: "SPEAR_STALKING", discipline: "SPEARFISHING", label: "Agguato" },
  { code: "SPEAR_CAVE", discipline: "SPEARFISHING", label: "Tana" },
  { code: "SPEAR_DROP", discipline: "SPEARFISHING", label: "Caduta" },
];

export const species: Species[] = [
  { code: "SPIGOLA", commonName: "Spigola", scientificName: "Dicentrarchus labrax" },
  { code: "ORATA", commonName: "Orata", scientificName: "Sparus aurata" },
  { code: "DENTICE", commonName: "Dentice", scientificName: "Dentex dentex" },
  { code: "RICCIOLA", commonName: "Ricciola", scientificName: "Seriola dumerili" },
  { code: "TONNO_ROSSO", commonName: "Tonno rosso", scientificName: "Thunnus thynnus" },
  { code: "PALAMITA", commonName: "Palamita", scientificName: "Sarda sarda" },
  { code: "LAMPUGA", commonName: "Lampuga", scientificName: "Coryphaena hippurus" },
  { code: "SERRA", commonName: "Serra", scientificName: "Pomatomus saltatrix" },
  { code: "BARRACUDA_MEDITERRANEO", commonName: "Barracuda mediterraneo", scientificName: "Sphyraena viridensis" },
  { code: "LECCIA_AMIA", commonName: "Leccia amia", scientificName: "Lichia amia" },
  { code: "SARAGO", commonName: "Sarago", scientificName: "Diplodus sargus" },
  { code: "CERNIA", commonName: "Cernia", scientificName: "Epinephelus marginatus" },
  { code: "CEFALO", commonName: "Cefalo", scientificName: "Mugil cephalus" },
  { code: "SEPPIA", commonName: "Seppia", scientificName: "Sepia officinalis" },
  { code: "CALAMARO", commonName: "Calamaro", scientificName: "Loligo vulgaris" },
];

export function labelForSpecies(code?: string) {
  return species.find((item) => item.code === code)?.commonName ?? "Specie non specificata";
}

export function labelForTechnique(code: string) {
  return techniques.find((item) => item.code === code)?.label ?? code;
}

export function labelForDiscipline(code: string) {
  return disciplines.find((item) => item.code === code)?.label ?? code;
}
