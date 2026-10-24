import { loadSnapshot } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const outcome = await loadSnapshot();
  if (!outcome.ok) {
    return Response.json(
      { ok: false, mbtaReachable: false, dataSource: null, fetchedAt: null, counts: { stations: 0, facilities: 0, alerts: 0 } },
      { status: 502 },
    );
  }
  const { snapshot } = outcome;
  return Response.json({
    ok: true,
    mbtaReachable: snapshot.source === "live",
    dataSource: snapshot.source,
    fetchedAt: snapshot.fetchedAt,
    counts: { stations: snapshot.stations.length, facilities: snapshot.facilities.length, alerts: snapshot.alerts.length },
  });
}
