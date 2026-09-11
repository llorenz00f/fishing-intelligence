import type { ThemeId, AppearanceMode } from "./preferences";
import type { WeatherTheme } from "./weather";

export type PaletteMode = "dark" | "light";
type Palette = { background: string; surface: string; elevated: string; strong: string; border: string; text: string; muted: string; accent: string; secondary: string; onAccent: string };
export type ThemeDefinition = { id: ThemeId; name: string; subtitle: string; premium: boolean; defaultMode: PaletteMode; modes: readonly PaletteMode[]; palette: Palette };

const ocean: Palette = { background: "#06151d", surface: "#0b202b", elevated: "#102b37", strong: "#173642", border: "#35505c", text: "#f2faf9", muted: "#a2b9c3", accent: "#25d0c1", secondary: "#dfbd7b", onAccent: "#042b2c" };
const mediterranean: Palette = { background: "#eef5f6", surface: "#ffffff", elevated: "#e2edf0", strong: "#d1e3e7", border: "#819fa8", text: "#123440", muted: "#496771", accent: "#086ca0", secondary: "#946021", onAccent: "#ffffff" };
export const themeRegistry: readonly ThemeDefinition[] = [
  { id: "deep-ocean", name: "Deep Ocean", subtitle: "Il mare, nella sua essenza.", premium: false, defaultMode: "dark", modes: ["dark", "light"], palette: ocean },
  { id: "mediterranean-light", name: "Mediterranean Light", subtitle: "La luce della costa.", premium: true, defaultMode: "light", modes: ["light"], palette: mediterranean },
  { id: "sunset", name: "Sunset", subtitle: "L'ultima luce, ancora in mare.", premium: true, defaultMode: "dark", modes: ["dark"], palette: { ...ocean, background: "#151b2c", surface: "#20283a", elevated: "#2a3245", strong: "#394258", border: "#546078", text: "#fbf6f1", muted: "#b8bfce", accent: "#f4a48c", secondary: "#8bd7d0", onAccent: "#37201c" } },
  { id: "graphite-marine", name: "Graphite Marine", subtitle: "Precisione. Nessuna distrazione.", premium: true, defaultMode: "dark", modes: ["dark"], palette: { background: "#191d20", surface: "#22282d", elevated: "#2c343a", strong: "#38434b", border: "#566773", text: "#eff4f6", muted: "#b2bfc8", accent: "#a8c9df", secondary: "#81c9b7", onAccent: "#1b303c" } },
  { id: "abyss", name: "Abyss", subtitle: "Solo tu e il mare aperto.", premium: true, defaultMode: "dark", modes: ["dark"], palette: { background: "#080e14", surface: "#0e1821", elevated: "#15232e", strong: "#233442", border: "#3e5668", text: "#dce8ef", muted: "#9bacbb", accent: "#8dbbc9", secondary: "#b0aacd", onAccent: "#142a33" } },
  { id: "dynamic-weather", name: "Dynamic Weather", subtitle: "In sintonia con il tempo.", premium: true, defaultMode: "dark", modes: ["dark"], palette: ocean },
];
export function getTheme(id: ThemeId) { return themeRegistry.find(theme => theme.id === id) ?? themeRegistry[0]; }
export function resolvePaletteMode(id: ThemeId, mode: AppearanceMode, systemLight: boolean): PaletteMode {
  const theme = getTheme(id);
  if (theme.modes.length === 1) return theme.defaultMode;
  return mode === "system" ? (systemLight ? "light" : "dark") : mode;
}

export function paletteTokens(p: Palette, mode: PaletteMode): Record<string, string> {
  const light = mode === "light";
  return {
    "--background": p.background, "--background-elevated": p.elevated, "--foreground": p.text,
    "--surface": p.surface, "--surface-solid": p.elevated, "--surface-strong": p.strong, "--surface-inverse": p.background,
    "--line": p.border, "--line-strong": `color-mix(in srgb, ${p.border} 75%, ${p.text})`, "--muted": p.muted,
    "--text-primary": p.text, "--text-secondary": p.muted, "--border": p.border,
    "--ocean": p.accent, "--ocean-strong": p.accent, "--primary-accent": p.accent, "--secondary-accent": p.secondary,
    "--ink": p.text, "--on-accent": p.onAccent, "--accent-tint": `color-mix(in srgb, ${p.accent} 12%, ${p.surface})`,
    "--success": light ? "#167047" : "#78ddb0", "--kelp": light ? "#167047" : "#78ddb0",
    "--warning": light ? "#81520c" : "#f0c16e", "--amber": light ? "#81520c" : "#f0c16e",
    "--danger": light ? "#b83436" : "#ff9e9e", "--coral": light ? "#b83436" : "#ff9e9e",
    "--warning-bg": light ? "#fff0d8" : "#352d20", "--warning-text": light ? "#754909" : "#f5cf92",
    "--score-good": light ? "#167047" : "#78ddb0", "--score-medium": light ? "#81520c" : "#f0c16e", "--score-poor": light ? "#b83436" : "#ff9e9e",
    "--chart-1": p.accent, "--chart-2": p.secondary, "--chart-3": light ? "#6357a0" : "#b5a7df", "--chart-4": light ? "#187861" : "#78ddb0",
    "--map-overlay": p.surface, "--map-marker": p.accent, "--map-marker-text": p.onAccent,
    "--nav-bg": `color-mix(in srgb, ${p.surface} 96%, transparent)`,
    "--glow": `color-mix(in srgb, ${p.accent} 15%, transparent)`,
    "--gradient": `linear-gradient(125deg, ${p.elevated}, ${p.background} 65%, color-mix(in srgb, ${p.secondary} 9%, ${p.background}))`,
    "--shadow-soft": `0 8px 32px ${light ? "#132c3610" : "#00000018"}`, "--shadow-card": `0 16px 48px ${light ? "#132c3618" : "#00000028"}`, "--shadow-float": `0 -8px 48px ${light ? "#132c3624" : "#00000045"}`,
    "--on-image": "#f2faf9", "--image-scrim": "#06151dce", "--image-border": "#ffffff70", "--backdrop": "#010b1190",
  };
}
const weatherPalettes: Record<WeatherTheme["colorVariant"], { palette: Palette; mode: PaletteMode }> = {
  neutral: { palette: ocean, mode: "dark" },
  day: { palette: { ...mediterranean, accent: "#08756f", secondary: "#98642c" }, mode: "light" },
  night: { palette: themeRegistry[4].palette, mode: "dark" },
  overcast: { palette: { ...ocean, background: "#1a262f", surface: "#25343e", elevated: "#2e414b", muted: "#b4c4cb", accent: "#a2cfdb" }, mode: "dark" },
  rain: { palette: { ...ocean, background: "#12212b", surface: "#1b303d", elevated: "#244250", muted: "#acc5d0", accent: "#93cfde" }, mode: "dark" },
  storm: { palette: { ...ocean, background: "#161d2b", surface: "#222d3e", elevated: "#2d3b51", muted: "#b7bfd0", accent: "#b2c9ed", secondary: "#d6b9cd" }, mode: "dark" },
  mist: { palette: { ...mediterranean, background: "#dfe9ec", surface: "#f0f5f6", elevated: "#d5e3e8", accent: "#3c6575" }, mode: "light" },
  dawn: { palette: { ...ocean, background: "#262638", surface: "#333548", elevated: "#42465a", accent: "#efb2a7", muted: "#c6c4d3", secondary: "#a5ccd3" }, mode: "dark" },
  dusk: { palette: themeRegistry[2].palette, mode: "dark" },
};
export function weatherPalette(variant: WeatherTheme["colorVariant"]) { return weatherPalettes[variant]; }
export function themeTokens(id: ThemeId, mode: PaletteMode) {
  const palette = id === "deep-ocean" && mode === "light" ? { ...mediterranean, accent: "#08746d", secondary: "#946021" } : getTheme(id).palette;
  return paletteTokens(palette, mode);
}
function declarations(tokens: Record<string, string>) { return Object.entries(tokens).map(([key, value]) => `${key}:${value}`).join(";"); }
export const themeStyleSheet = themeRegistry.flatMap(theme => theme.modes.map(mode => `:root[data-palette="${theme.id}"][data-theme="${mode}"],[data-preview-palette="${theme.id}"][data-preview-mode="${mode}"]{${declarations(themeTokens(theme.id, mode))};color-scheme:${mode}}`)).join("\n");

// The first paint uses only guest preferences; authenticated settings are scoped to the verified user.
export const themeBootstrapScript = `(function(){try{var p=JSON.parse(localStorage.getItem('fi:appearance:guest')||'null');var old=localStorage.getItem('fishing-theme');var m=p&&p.appearanceMode||old||'dark';document.documentElement.dataset.palette='deep-ocean';document.documentElement.dataset.theme=m==='light'||m==='system'&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}catch(e){}})()`;
