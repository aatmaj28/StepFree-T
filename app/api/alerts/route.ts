import { StationFilterQuerySchema } from "@/lib/api/schemas";
import { loadSnapshot, parseQuery, sourceMeta } from "@/lib/api/http";
import { isAlertActive } from "@/lib/engine/rules";

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
  const nowMs = Date.now();
  const alerts = snapshot.alerts.filter(
    (a) => isAlertActive(a, nowMs) && (!stationId || a.stationIds.includes(stationId)),
  );
  return Response.json({ alerts, count: alerts.length, ...sourceMeta(snapshot) });
}
