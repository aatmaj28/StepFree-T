import { StationFilterQuerySchema } from "@/lib/api/schemas";
import { loadSnapshot, parseQuery, sourceMeta } from "@/lib/api/http";
import { PLATFORM_MAP } from "@/lib/data/platform-map";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const query = parseQuery(StationFilterQuerySchema, request.url);
  if (!query.ok) return query.response;
  const outcome = await loadSnapshot();
  if (!outcome.ok) return outcome.response;
  const { snapshot } = outcome;
  const { stationId } = query.data;

  if (stationId && !snapshot.stations.some((s) => s.id === stationId)) {
    return Response.json({ error: "Unknown station", details: { stationId } }, { status: 404 });
  }
  const facilities = snapshot.facilities
    .filter((f) => !stationId || f.stationId === stationId)
    .map((f) => ({ ...f, platformMapVerified: PLATFORM_MAP[f.id]?.verified ?? null }));
  return Response.json({ facilities, count: facilities.length, ...sourceMeta(snapshot) });
}
