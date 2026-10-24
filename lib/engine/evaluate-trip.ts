import type { AccessStatus, Alert, DataSnapshot, Reason, Station, Trip, TripResult } from "@/lib/types";
import { PLATFORM_MAP, type PlatformMap } from "@/lib/data/platform-map";
import { findAlternative } from "./find-alternative";
import { checkFreshness, evaluateStation, worst, type StationVerdict } from "./rules";

function dedupe(alerts: Alert[]): Alert[] {
  const seen = new Set<string>();
  return alerts.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
}

function unknownResult(snapshot: DataSnapshot, reasons: Reason[], isStale: boolean): TripResult {
  return {
    status: "UNKNOWN",
    reasons,
    blockingAlerts: [],
    infoAlerts: [],
    alternative: null,
    dataSource: snapshot.source,
    fetchedAt: snapshot.fetchedAt,
    isStale,
  };
}

/**
 * The decision engine. Pure: the same (trip, snapshot, now, platformMap) always gives the same result.
 *
 * STEP_FREE is returned only when the data is fresh AND both stations are verified accessible AND no
 * active blocking alert affects either station AND every elevator outage is covered by a verified
 * working elevator on the same platform. Everything else is NOT_STEP_FREE or UNKNOWN.
 */
export function evaluateTrip(
  trip: Trip,
  snapshot: DataSnapshot,
  now: Date,
  platformMap: PlatformMap = PLATFORM_MAP,
): TripResult {
  const nowMs = now.getTime();
  const freshness = checkFreshness(snapshot.fetchedAt, nowMs);
  if (!freshness.fresh) {
    const minutes = freshness.ageMinutes === undefined ? null : Math.round(freshness.ageMinutes);
    const message =
      freshness.code === "DATA_INVALID"
        ? "The time on this MBTA data is missing or invalid, so we cannot trust it."
        : `This MBTA data is ${minutes ?? "many"} minutes old. We only trust data under 10 minutes old.`;
    return unknownResult(snapshot, [{ code: freshness.code ?? "DATA_INVALID", stationId: trip.originId, message }], true);
  }

  const origin = snapshot.stations.find((s) => s.id === trip.originId);
  const destination = snapshot.stations.find((s) => s.id === trip.destinationId);
  const missing = [
    origin ? null : trip.originId,
    destination ? null : trip.destinationId,
  ].filter((id): id is string => id !== null);
  if (!origin || !destination) {
    return unknownResult(
      snapshot,
      missing.map((id) => ({ code: "STATION_NOT_FOUND", stationId: id, message: `We do not have a station with id "${id}".` })),
      false,
    );
  }
  if (origin.id === destination.id) {
    return unknownResult(
      snapshot,
      [{ code: "SAME_STATION", stationId: origin.id, message: "The start and end are the same station." }],
      false,
    );
  }

  const verdicts: StationVerdict[] = [origin, destination].map((s) =>
    evaluateStation(s, trip.profile, snapshot, nowMs, platformMap),
  );
  const status: AccessStatus = verdicts.reduce<AccessStatus>((acc, v) => worst(acc, v.status), "STEP_FREE");
  const blockingAlerts = dedupe(verdicts.flatMap((v) => v.blocking));
  const blockingIds = new Set(blockingAlerts.map((a) => a.id));
  const infoAlerts = dedupe(verdicts.flatMap((v) => v.info)).filter((a) => !blockingIds.has(a.id));

  const stations: Station[] = [origin, destination];
  const problemIndex = verdicts.findIndex((v) => v.status !== "STEP_FREE");
  const problem = problemIndex >= 0 ? stations[problemIndex] : undefined;
  const alternative =
    status !== "STEP_FREE" && problem
      ? findAlternative(problem, new Set([origin.id, destination.id]), trip.profile, snapshot, nowMs, platformMap)
      : null;

  return {
    status,
    reasons: verdicts.flatMap((v) => v.reasons),
    blockingAlerts,
    infoAlerts,
    alternative,
    dataSource: snapshot.source,
    fetchedAt: snapshot.fetchedAt,
    isStale: false,
  };
}
