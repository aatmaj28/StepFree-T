import { StatusQuerySchema } from "@/lib/api/schemas";
import { loadSnapshot, parseQuery } from "@/lib/api/http";
import { evaluateTrip } from "@/lib/engine/evaluate-trip";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const query = parseQuery(StatusQuerySchema, request.url);
  if (!query.ok) return query.response;
  const { origin, destination, profile } = query.data;

  const outcome = await loadSnapshot();
  if (!outcome.ok) return outcome.response;
  const { snapshot } = outcome;

  const result = evaluateTrip({ originId: origin, destinationId: destination, profile }, snapshot, new Date());
  return Response.json({
    ...result,
    trip: {
      profile,
      origin: snapshot.stations.find((s) => s.id === origin) ?? null,
      destination: snapshot.stations.find((s) => s.id === destination) ?? null,
    },
  });
}
