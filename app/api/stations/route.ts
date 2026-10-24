import { loadSnapshot, sourceMeta } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const outcome = await loadSnapshot();
  if (!outcome.ok) return outcome.response;
  const { snapshot } = outcome;
  return Response.json({
    stations: snapshot.stations, // already sorted by name
    count: snapshot.stations.length,
    ...sourceMeta(snapshot),
  });
}
