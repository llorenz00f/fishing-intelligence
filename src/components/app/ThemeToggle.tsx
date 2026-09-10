"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("fishing-theme", callback);
  return () => window.removeEventListener("fishing-theme", callback);
}
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme ?? "dark", () => "dark");
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#06151D" : "#EDF3F2");
    try { localStorage.setItem("fishing-theme", next); } catch { /* The theme works without storage. */ }
    window.dispatchEvent(new Event("fishing-theme"));
  }
  const label = theme === "dark" ? "Attiva tema chiaro" : "Attiva tema scuro";
  return <button className="icon-action" onClick={toggle} aria-label={label} title={label}>{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}</button>;
}
