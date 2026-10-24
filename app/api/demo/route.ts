import { DemoQuerySchema } from "@/lib/api/schemas";
import { parseQuery } from "@/lib/api/http";
import { buildDemoSnapshot, DEMO_TRIP } from "@/lib/data/demo-snapshot";
import { evaluateTrip } from "@/lib/engine/evaluate-trip";

export const dynamic = "force-dynamic";

/** SIMULATED data only. The real routes never touch lib/data/demo-snapshot.ts. */
export async function GET(request: Request): Promise<Response> {
  const query = parseQuery(DemoQuerySchema, request.url);
  if (!query.ok) return query.response;
  const { scenario } = query.data;

  const now = new Date();
  const snapshot = buildDemoSnapshot(scenario, now);
  const trip = { ...DEMO_TRIP, profile: "wheelchair" as const };
  const result = evaluateTrip(trip, snapshot, now);
  return Response.json({
    ...result,
    simulated: true,
    label: "Simulated demo data",
    scenario,
    trip: {
      profile: trip.profile,
      origin: snapshot.stations.find((s) => s.id === trip.originId) ?? null,
      destination: snapshot.stations.find((s) => s.id === trip.destinationId) ?? null,
    },
  });
}
