import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function readJson(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new ApiError("Richiesta non consentita.", 403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new ApiError("Formato non valido.", 415);
  if (Number(request.headers.get("content-length")) > 100_000) throw new ApiError("Richiesta troppo grande.", 413);
  try { return await request.json() as unknown; } catch { throw new ApiError("Dati non validi.", 400); }
}

export function apiError(error: unknown) {
  if (error instanceof ApiError) return privateJson({ error: error.message }, error.status);
  if (error instanceof ZodError) return privateJson({ error: "Controlla i campi inseriti.", fields: error.flatten().fieldErrors }, 400);
  return privateJson({ error: "Servizio non disponibile. Riprova tra poco." }, 503);
}
