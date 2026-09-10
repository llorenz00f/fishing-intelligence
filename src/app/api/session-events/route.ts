import { NextResponse } from "next/server";
import { z } from "zod";
import { MockSessionEventRepository } from "@/infrastructure/repositories/session-event-repository";

const eventSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  sessionId: z.string(),
  type: z.enum(["STRIKE", "CATCH", "SPOT_CHANGE", "NOTE", "PHOTO"]),
  timestamp: z.string().datetime(),
  note: z.string().optional(),
  synced: z.boolean().default(false),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      label: z.string().optional(),
    })
    .optional(),
});

const bodySchema = z.object({
  events: z.array(eventSchema).max(50),
});

const repository = new MockSessionEventRepository();

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid session event payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await repository.saveEvents(parsed.data.events);
  return NextResponse.json({ ok: true, accepted: result.accepted });
}
