import type { Alert, ActivePeriod, DataSnapshot, DataSource, Facility, Station, WheelchairBoarding } from "@/lib/types";
import type { RawAlert, RawAlertsResponse, RawFacilitiesResponse, RawStop, RawStopsResponse } from "./schemas";
import { servedPlatforms } from "./platform-map";

export interface LineStops {
  line: string;
  response: RawStopsResponse;
}

export interface RawBundle {
  lines: LineStops[];
  platforms: RawStopsResponse;
  facilities: RawFacilitiesResponse;
  alerts: RawAlertsResponse;
  fetchedAt: string;
  source: DataSource;
}

/** MBTA wheelchair_boarding: 0 = no information, 1 = accessible, 2 = not accessible. */
export function wheelchairFromCode(code: number | null | undefined): WheelchairBoarding {
  if (code === 1) return "accessible";
  if (code === 2) return "not_accessible";
  return "unknown";
}

/** Green-B, Green-C ... all become the single line "Green". */
export function lineLabel(line: string): string {
  return line.startsWith("Green") ? "Green" : line;
}

function parentIdOf(stop: RawStop): string {
  const parent = stop.relationships?.parent_station?.data;
  return parent?.id ?? stop.id;
}

function indexStops(...responses: RawStopsResponse[]): Map<string, RawStop> {
  const byId = new Map<string, RawStop>();
  for (const res of responses) {
    for (const s of [...(res.included ?? []), ...res.data]) byId.set(s.id, s);
  }
  return byId;
}

/** Stations are the parent stops. Child platforms are folded into their parent; stations are deduplicated by id. */
export function normalizeStations(lines: LineStops[], platforms: RawStopsResponse): Station[] {
  const byId = indexStops(platforms, ...lines.map((l) => l.response));
  const stations = new Map<string, { raw: RawStop; lines: Set<string> }>();

  for (const { line, response } of lines) {
    for (const stop of response.data) {
      const parent = byId.get(parentIdOf(stop)) ?? stop;
      const slot = stations.get(parent.id) ?? { raw: parent, lines: new Set<string>() };
      slot.lines.add(lineLabel(line));
      stations.set(parent.id, slot);
    }
  }

  const out: Station[] = [];
  for (const [id, { raw, lines: lineSet }] of stations) {
    const { latitude, longitude } = raw.attributes;
    if (typeof latitude !== "number" || typeof longitude !== "number") continue;
    out.push({
      id,
      name: raw.attributes.name,
      lines: [...lineSet].sort(),
      wheelchairBoarding: wheelchairFromCode(raw.attributes.wheelchair_boarding),
      lat: latitude,
      lng: longitude,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

/** Maps every subway platform stop id (e.g. "70061") and station id to its parent station id. */
export function buildStopToStation(platforms: RawStopsResponse, stations: Station[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of platforms.data) map.set(s.id, parentIdOf(s));
  for (const st of stations) map.set(st.id, st.id);
  return map;
}

export function normalizeFacilities(
  res: RawFacilitiesResponse,
  stopToStation: Map<string, string>,
  stationIds: Set<string>,
): Facility[] {
  const out: Facility[] = [];
  for (const f of res.data) {
    const stopId = f.relationships?.stop?.data?.id;
    if (!stopId) continue;
    const stationId = stopToStation.get(stopId) ?? stopId;
    if (!stationIds.has(stationId)) continue; // Commuter Rail only stations etc.
    const type = f.attributes.type.toUpperCase() === "ELEVATOR" ? "elevator" : "escalator";
    out.push({
      id: f.id,
      stationId,
      type,
      name: f.attributes.long_name ?? f.attributes.short_name ?? `Facility ${f.id}`,
      servesPlatforms: type === "elevator" ? servedPlatforms(f.id) : "unknown",
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

/** Effects that matter for step-free travel. Delays, shuttles and suspensions are not accessibility events. */
export const ACCESSIBILITY_EFFECTS = new Set([
  "STATION_CLOSURE",
  "STOP_CLOSURE",
  "ACCESS_ISSUE",
  "ELEVATOR_CLOSURE",
  "ESCALATOR_CLOSURE",
  "STATION_ISSUE",
]);

function isEpochPlaceholder(value: string | null | undefined): boolean {
  if (!value) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && ms <= 0;
}

/**
 * MBTA sometimes sends a brand new alert with start = end = 1969-12-31T19:00-05:00 (Unix epoch 0)
 * as a "not yet scheduled" placeholder (seen on NEW elevator alerts). Read literally that is an
 * expired alert, which would hide a real outage. We treat it as "active since created, no end".
 */
export function normalizeActivePeriods(raw: RawAlert): ActivePeriod[] {
  const created = raw.attributes.created_at ?? raw.attributes.updated_at ?? new Date(0).toISOString();
  const periods = raw.attributes.active_period ?? [];
  return periods.map((p) => {
    const startRaw = p.start ?? null;
    const endRaw = p.end ?? null;
    const start = !startRaw || isEpochPlaceholder(startRaw) ? created : startRaw;
    const end = !endRaw || isEpochPlaceholder(endRaw) ? null : endRaw;
    return { start, end };
  });
}

export function normalizeAlerts(
  res: RawAlertsResponse,
  stopToStation: Map<string, string>,
  facilityToStation: Map<string, string>,
  stationIds: Set<string>,
): Alert[] {
  const out: Alert[] = [];
  for (const a of res.data) {
    if (!ACCESSIBILITY_EFFECTS.has(a.attributes.effect)) continue;
    const stations = new Set<string>();
    const facilities = new Set<string>();
    for (const e of a.attributes.informed_entity ?? []) {
      if (e.facility) {
        facilities.add(e.facility);
        const owner = facilityToStation.get(e.facility);
        if (owner) stations.add(owner);
      }
      if (e.stop) {
        const station = stopToStation.get(e.stop);
        if (station && stationIds.has(station)) stations.add(station);
      }
    }
    if (stations.size === 0) continue; // not about any subway station
    out.push({
      id: a.id,
      effect: a.attributes.effect,
      header: a.attributes.header ?? "",
      description: a.attributes.description ?? "",
      stationIds: [...stations].sort(),
      facilityIds: [...facilities].sort(),
      activePeriod: normalizeActivePeriods(a),
      severity: a.attributes.severity ?? 0,
      updatedAt: a.attributes.updated_at ?? a.attributes.created_at ?? "",
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

export function buildSnapshot(bundle: RawBundle): DataSnapshot {
  const stations = normalizeStations(bundle.lines, bundle.platforms);
  const stationIds = new Set(stations.map((s) => s.id));
  const stopToStation = buildStopToStation(bundle.platforms, stations);
  const facilities = normalizeFacilities(bundle.facilities, stopToStation, stationIds);
  const facilityToStation = new Map(facilities.map((f) => [f.id, f.stationId] as const));
  const alerts = normalizeAlerts(bundle.alerts, stopToStation, facilityToStation, stationIds);
  return { stations, facilities, alerts, fetchedAt: bundle.fetchedAt, source: bundle.source };
}
