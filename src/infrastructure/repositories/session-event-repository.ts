import type { SessionEvent } from "@/domain/sessions/types";

export interface SessionEventRepository {
  saveEvents(events: SessionEvent[]): Promise<{ accepted: number }>;
}

export class MockSessionEventRepository implements SessionEventRepository {
  async saveEvents(events: SessionEvent[]) {
    return { accepted: events.length };
  }
}
