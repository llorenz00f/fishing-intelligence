"use client";

import { useCallback, useEffect, useState } from "react";
import { openDB } from "idb";
import type { SessionEvent } from "@/domain/sessions/types";

const dbName = "fishing-intelligence-offline";
const storeName = "session-events";
type OfflineEvent = SessionEvent & { userId: string };

async function db() {
  return openDB(dbName, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: "clientId" });
      }
    },
  });
}

export function useOfflineQueue(userId: string, sessionId: string) {
  const [pendingEvents, setPendingEvents] = useState<SessionEvent[]>([]);
  const [storedEvents, setStoredEvents] = useState<SessionEvent[]>([]);

  const refresh = useCallback(async () => {
    const database = await db();
    const all = (await database.getAll(storeName)) as OfflineEvent[];
    const owned = all.filter((event) => event.userId === userId && event.sessionId === sessionId);
    setStoredEvents(owned);
    setPendingEvents(owned.filter((event) => !event.synced));
  }, [sessionId, userId]);

  const enqueue = useCallback(
    async (event: SessionEvent) => {
      const database = await db();
      await database.put(storeName, { ...event, userId });
      await refresh();
    },
    [refresh, userId],
  );

  const sync = useCallback(async () => {
    const database = await db();
    const all = ((await database.getAll(storeName)) as OfflineEvent[]).filter(
      (event) => event.userId === userId && event.sessionId === sessionId && !event.synced,
    );
    if (!all.length || !navigator.onLine) return;

    const response = await fetch("/api/session-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: all }),
    }).catch(() => null);
    if (!response?.ok) return;
    await Promise.all(all.map((event) => database.put(storeName, { ...event, synced: true })));
    await refresh();
  }, [refresh, sessionId, userId]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refresh();
      void sync();
    }, 0);
    window.addEventListener("online", sync);
    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener("online", sync);
    };
  }, [refresh, sync]);

  return { pendingEvents, storedEvents, enqueue, sync };
}
