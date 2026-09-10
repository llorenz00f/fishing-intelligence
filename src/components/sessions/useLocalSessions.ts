"use client";
import { useEffect, useState } from "react";
import { openDB } from "idb";
import { disciplines, techniques } from "@/data/catalog";
import type { FishingSession, SessionEvent } from "@/domain/sessions/types";

export type JournalSession = Pick<FishingSession, "id" | "discipline" | "technique" | "targetSpecies" | "startTime" | "endTime" | "primarySpot" | "conditionScore" | "events"> & { catches: Array<{ id: string }> };
export function useLocalSessions() {
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function read() {
      const local: JournalSession[] = [];
      try {
        const database = await openDB("fishing-intelligence-offline", 1, {
          upgrade(db) { if (!db.objectStoreNames.contains("session-events")) db.createObjectStore("session-events", { keyPath: "clientId" }); },
        });
        const allEvents = await database.getAll("session-events") as SessionEvent[];
        database.close();
        for (let index = 0; index < localStorage.length; index++) {
          const key = localStorage.key(index);
          if (!key?.startsWith("session:")) continue;
          try {
            const value = JSON.parse(localStorage.getItem(key) ?? "{}");
            const discipline = disciplines.find(item => item.code === value.discipline);
            const technique = techniques.find(item => item.code === value.technique && item.discipline === discipline?.code);
            if (!discipline || !technique || typeof value.startTime !== "string" || !Number.isFinite(Date.parse(value.startTime))) continue;
            const id = key.slice("session:".length);
            const events = allEvents.filter(event => event.sessionId === id).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
            local.push({
              id, discipline: discipline.code, technique: technique.code, startTime: value.startTime,
              endTime: typeof value.endTime === "string" && Number.isFinite(Date.parse(value.endTime)) ? value.endTime : undefined,
              primarySpot: typeof value.spot === "string" ? value.spot : undefined,
              targetSpecies: typeof value.targetSpecies === "string" ? value.targetSpecies : undefined,
              events, catches: events.filter(event => event.type === "CATCH").map(event => ({ id: event.id })),
            });
          } catch { /* One unreadable local entry must not hide the rest of the diary. */ }
        }
      } catch { /* The server-provided diary remains available when local storage is blocked. */ }
      if (!cancelled) { setSessions(local); setLoaded(true); }
    }
    void read();
    window.addEventListener("storage", read);
    return () => { cancelled = true; window.removeEventListener("storage", read); };
  }, []);
  return { sessions, loaded };
}
