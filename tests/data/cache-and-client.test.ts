import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cached, clearCache } from "@/lib/data/cache";
import { fetchAlerts, MbtaError, REQUEST_TIMEOUT_MS } from "@/lib/data/mbta-client";

describe("cache", () => {
  beforeEach(() => clearCache());

  it("de-duplicates concurrent loads (one in-flight request)", async () => {
    const loader = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return 42;
    });
    const results = await Promise.all([cached("k", 60_000, loader), cached("k", 60_000, loader), cached("k", 60_000, loader)]);
    expect(results).toEqual([42, 42, 42]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("serves from cache within the TTL and reloads after it", async () => {
    let t = 1000;
    const loader = vi.fn(async () => t);
    expect(await cached("ttl", 60_000, loader, () => t)).toBe(1000);
    t = 30_000;
    expect(await cached("ttl", 60_000, loader, () => t)).toBe(1000);
    t = 61_001;
    expect(await cached("ttl", 60_000, loader, () => t)).toBe(61_001);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("does not cache failures", async () => {
    const loader = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("ok");
    await expect(cached("f", 60_000, loader)).rejects.toThrow("boom");
    expect(await cached("f", 60_000, loader)).toBe("ok");
  });
});

const okBody = { data: [], jsonapi: { version: "1.0" } };
const okResponse = () => new Response(JSON.stringify(okBody), { status: 200 });

describe("mbta-client", () => {
  const originalKey = process.env.MBTA_API_KEY;
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    if (originalKey === undefined) delete process.env.MBTA_API_KEY;
    else process.env.MBTA_API_KEY = originalKey;
  });

  it("sends x-api-key only when MBTA_API_KEY is set", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => okResponse());
    vi.stubGlobal("fetch", fetchMock);
    delete process.env.MBTA_API_KEY;
    await fetchAlerts();
    const firstHeaders = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>;
    expect(firstHeaders["x-api-key"]).toBeUndefined();

    process.env.MBTA_API_KEY = "secret";
    await fetchAlerts();
    const secondHeaders = (fetchMock.mock.calls[1]?.[1] as RequestInit).headers as Record<string, string>;
    expect(secondHeaders["x-api-key"]).toBe("secret");
  });

  it("retries once after a failure, then succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("nope", { status: 503 })).mockResolvedValueOnce(okResponse());
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchAlerts()).resolves.toMatchObject({ data: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 429 rate-limit answer (a retry only burns more of the quota)", async () => {
    const fetchMock = vi.fn(async () => new Response("slow down", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchAlerts()).rejects.toBeInstanceOf(MbtaError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after one retry with an MbtaError", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchAlerts()).rejects.toBeInstanceOf(MbtaError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("aborts a request that takes longer than the timeout", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const pending = fetchAlerts().catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 10);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 10);
    expect(await pending).toBeInstanceOf(MbtaError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a response with an unexpected shape", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ nope: true }), { status: 200 })));
    await expect(fetchAlerts()).rejects.toBeInstanceOf(MbtaError);
  });
});
