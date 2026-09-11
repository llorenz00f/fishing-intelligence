"use client";
import Link from "next/link";
import { Moon, Palette, Sun } from "lucide-react";
import { useAppearance } from "@/components/appearance/ThemeProvider";
import { getTheme } from "@/domain/appearance/registry";

export function ThemeToggle() {
  const { preferences, updatePreferences, mode: theme } = useAppearance();
  if (getTheme(preferences.themeId).modes.length === 1) return <Link href="/profile/appearance" className="icon-action" aria-label="Aspetto" title="Aspetto"><Palette size={20} /></Link>;
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    updatePreferences({ appearanceMode: next });
  }
  const label = theme === "dark" ? "Attiva tema chiaro" : "Attiva tema scuro";
  return <button className="icon-action" onClick={toggle} aria-label={label} title={label}>{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}</button>;
}
