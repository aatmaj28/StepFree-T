// Additive fields for the journey map, shared by /api/status and /api/demo. The trip payload in those
// responses is left exactly as buildTripPayload() returned it. Everything here is extra.
import type { Alert, DataSnapshot, Trip } from "@/lib/types";
import { getNetwork } from "@/lib/data/network";
import { routeRelationship, type RouteRelationship } from "@/lib/engine/journey";
import { stationStatuses, type StationMarker } from "@/lib/engine/station-map";

export interface MapPayload {
  journey: RouteRelationship & { transferStations?: { id: string; name: string }[] };
  /** Every station's own engine verdict, for the map markers and the station list. */
  stations: StationMarker[];
  /** Active alerts referenced by any station marker, for the station detail panel. */
  stationAlerts: Alert[];
}

export async function mapPayload(trip: Trip, snapshot: DataSnapshot, now: Date): Promise<MapPayload> {
  const network = await getNetwork();
  const journey = routeRelationship(trip.originId, trip.destinationId, network?.patterns ?? null);
  const stations = stationStatuses(snapshot, trip.profile, now);
  const referenced = new Set(stations.flatMap((s) => [...s.blockingAlertIds, ...s.infoAlertIds]));
  const nameOf = new Map(snapshot.stations.map((s) => [s.id, s.name] as const));
  return {
    journey:
      journey.kind === "transfer"
        ? { ...journey, transferStations: journey.transferStationIds.map((id) => ({ id, name: nameOf.get(id) ?? id })) }
        : journey,
    stations,
    stationAlerts: snapshot.alerts.filter((a) => referenced.has(a.id)),
  };
}
