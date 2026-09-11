import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const origin = "https://fishing-intelligence.vercel.app";
const source = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");
type WorkerRequest = Pick<Request, "url" | "method" | "mode">;
type FetchEvent = { request: WorkerRequest; respondWith: (response: Promise<Response>) => void };

function createWorker() {
  const listeners: Record<string, (event: FetchEvent) => void> = {};
  const fetch = vi.fn<(request: WorkerRequest) => Promise<Response>>();
  const match = vi.fn<(request: WorkerRequest | string) => Promise<Response | undefined>>()
    .mockResolvedValue(undefined);
  runInNewContext(source, {
    self: {
      location: { origin },
      addEventListener: (name: string, listener: (event: FetchEvent) => void) => { listeners[name] = listener; },
    },
    fetch,
    caches: { match },
    URL,
    Response,
  });
  function request(url: string, mode: RequestMode = "cors", method = "GET") {
    const respondWith = vi.fn<(response: Promise<Response>) => void>();
    const request = { url: new URL(url, origin).href, mode, method };
    listeners.fetch({ request, respondWith });
    return { request, respondWith, response: respondWith.mock.calls[0]?.[0] };
  }
  return { fetch, match, request };
}

describe("offline document fallback", () => {
  it.each([
    "https://tiles.openfreemap.org/styles/liberty",
    "https://tiles.openfreemap.org/planet/12/2171/1508.pbf",
    "https://tiles.openfreemap.org/fonts/Noto%20Sans%20Regular/0-255.pbf",
    "https://tiles.openfreemap.org/sprites/ofm.png",
    "https://custom-map.example/style.json",
    "https://project.supabase.co/rest/v1/spots",
    "/api/forecast?lat=42.769&lng=10.881",
    "/dashboard?_rsc=payload",
    "/_next/static/chunks/app.js",
    "/maplibre/maplibre-gl-worker.mjs",
    "/maplibre/maplibre-gl-shared.mjs",
  ])("does not intercept data or asset requests: %s", (url) => {
    const worker = createWorker();
    const event = worker.request(url);
    expect(event.respondWith).not.toHaveBeenCalled();
    expect(worker.fetch).not.toHaveBeenCalled();
    expect(worker.match).not.toHaveBeenCalled();
  });

  it("leaves cross-origin navigations and writes to the browser", () => {
    const worker = createWorker();
    expect(worker.request("https://example.com/", "navigate").respondWith).not.toHaveBeenCalled();
    expect(worker.request("/api/sessions", "navigate", "POST").respondWith).not.toHaveBeenCalled();
  });

  it("serves online documents from the network", async () => {
    const worker = createWorker();
    const document = new Response("<html>Map</html>");
    worker.fetch.mockResolvedValue(document);
    const event = worker.request("/map", "navigate");
    expect(await event.response).toBe(document);
    expect(worker.fetch).toHaveBeenCalledWith(event.request);
    expect(worker.match).not.toHaveBeenCalled();
  });

  it("retains HTTP error responses instead of hiding them with the dashboard", async () => {
    const worker = createWorker();
    const response = new Response("Unavailable", { status: 503 });
    worker.fetch.mockResolvedValue(response);
    expect(await worker.request("/map", "navigate").response).toBe(response);
    expect(worker.match).not.toHaveBeenCalled();
  });

  it("serves the matching cached document when offline", async () => {
    const worker = createWorker();
    const cached = new Response("<html>Cached document</html>");
    worker.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    worker.match.mockResolvedValueOnce(cached);
    const event = worker.request("/dashboard", "navigate");
    expect(await event.response).toBe(cached);
    expect(worker.match).toHaveBeenCalledExactlyOnceWith(event.request);
  });

  it("retains the dashboard fallback for uncached offline navigations", async () => {
    const worker = createWorker();
    const cached = new Response("<html>Dashboard</html>");
    worker.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    worker.match.mockResolvedValueOnce(undefined).mockResolvedValueOnce(cached);
    expect(await worker.request("/map", "navigate").response).toBe(cached);
    expect(worker.match).toHaveBeenLastCalledWith("/dashboard");
  });

  it("returns a network error if there is no offline document", async () => {
    const worker = createWorker();
    worker.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    expect((await worker.request("/map", "navigate").response)?.type).toBe("error");
  });
});
