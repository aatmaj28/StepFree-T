import { AlternativesQuerySchema } from "@/lib/api/schemas";
import { loadSnapshot, parseQuery, sourceMeta } from "@/lib/api/http";
import { checkFreshness } from "@/lib/engine/rules";
import { findAlternatives } from "@/lib/engine/find-alternative";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const query = parseQuery(AlternativesQuerySchema, request.url);
  if (!query.ok) return query.response;
  const { stationId, profile } = query.data;

  const outcome = await loadSnapshot();
  if (!outcome.ok) return outcome.response;
  const { snapshot } = outcome;

  const station = snapshot.stations.find((s) => s.id === stationId);
  if (!station) return Response.json({ error: "Unknown station", details: { stationId } }, { status: 404 });

  const nowMs = Date.now();
  const fresh = checkFreshness(snapshot.fetchedAt, nowMs).fresh;
  const alternatives = findAlternatives(station, new Set(), profile, snapshot, nowMs);
  return Response.json({ station, profile, alternatives, isStale: !fresh, ...sourceMeta(snapshot) });
}
