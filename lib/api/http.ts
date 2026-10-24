import type { ZodType, ZodTypeDef } from "zod";
import type { DataSnapshot } from "@/lib/types";
import { DataUnavailableError, getSnapshot } from "@/lib/data/snapshot";

export type Parsed<T> = { ok: true; data: T } | { ok: false; response: Response };

export function badRequest(details: unknown): Response {
  return Response.json({ error: "Invalid request", details }, { status: 400 });
}

/** Validates URL query parameters with Zod. Returns a ready-made 400 response on failure. */
export function parseQuery<T>(schema: ZodType<T, ZodTypeDef, unknown>, url: string): Parsed<T> {
  const params = Object.fromEntries(new URL(url).searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) return { ok: false, response: badRequest(result.error.flatten()) };
  return { ok: true, data: result.data };
}

export type SnapshotOutcome = { ok: true; snapshot: DataSnapshot } | { ok: false; response: Response };

/** Live -> snapshot fallback is inside getSnapshot. Only a total failure becomes a 502. */
export async function loadSnapshot(): Promise<SnapshotOutcome> {
  try {
    return { ok: true, snapshot: await getSnapshot() };
  } catch (err) {
    const message = err instanceof DataUnavailableError ? err.message : "Unexpected error loading MBTA data.";
    return {
      ok: false,
      response: Response.json(
        { error: "MBTA data is unavailable and no offline snapshot could be read.", details: message, status: "UNKNOWN" },
        { status: 502 },
      ),
    };
  }
}

export function sourceMeta(snapshot: DataSnapshot): { dataSource: DataSnapshot["source"]; fetchedAt: string } {
  return { dataSource: snapshot.source, fetchedAt: snapshot.fetchedAt };
}
