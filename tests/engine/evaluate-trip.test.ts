// Example-based engine tests: the cases the spec calls out, with readable inputs.
import { describe, expect, it } from "vitest";
import type { Alert, DataSnapshot, Facility, Station } from "@/lib/types";
import { evaluateTrip } from "@/lib/engine/evaluate-trip";
import { findAlternatives } from "@/lib/engine/find-alternative";
import { haversineKm } from "@/lib/engine/geo";
import { alertKind, impactFor } from "@/lib/engine/rules";
import type { PlatformMap } from "@/lib/data/platform-map";

const NOW = new Date("2026-10-24T16:00:00Z");
const SINCE = "2026-10-24T10:00:00Z";

const st = (id: string, lat: number, over: Partial<Station> = {}): Station => ({
  id, name: id.toUpperCase(), lines: ["Red"], wheelchairBoarding: "accessible", lat, lng: -71.1, ...over,
});
const elev = (id: string, stationId: string): Facility => ({ id, stationId, type: "elevator", name: `Elevator ${id}`, servesPlatforms: "unknown" });
const alert = (id: string, effect: string, stationIds: string[], facilityIds: string[] = [], over: Partial<Alert> = {}): Alert => ({
  id, effect, header: `${effect} header`, description: "", stationIds, facilityIds,
  activePeriod: [{ start: SINCE, end: null }], severity: 3, updatedAt: SINCE, ...over,
});
const snap = (alerts: Alert[], over: Partial<DataSnapshot> = {}): DataSnapshot => ({
  stations: [st("a", 42.30), st("b", 42.31), st("c", 42.32), st("d", 42.33)],
  facilities: [elev("a1", "a"), elev("a2", "a"), elev("b1", "b")],
  alerts, fetchedAt: "2026-10-24T15:58:00Z", source: "live", ...over,
});
const trip = { originId: "a", destinationId: "b", profile: "wheelchair" as const };
const entry = (stationId: string, platforms: string[], verified: boolean) => ({ stationId, platforms, verified });

describe("evaluateTrip: the happy path and the hard blocks", () => {
  it("is STEP_FREE only when everything is verified", () => {
    const r = evaluateTrip(trip, snap([]), NOW, {});
    expect(r.status).toBe("STEP_FREE");
    expect(r.alternative).toBeNull();
  });

  it("is NOT_STEP_FREE when a station closure is active", () => {
    const r = evaluateTrip(trip, snap([alert("x", "STATION_CLOSURE", ["a"])]), NOW, {});
    expect(r.status).toBe("NOT_STEP_FREE");
    expect(r.blockingAlerts.map((a) => a.id)).toEqual(["x"]);
  });

  it("is NOT_STEP_FREE when MBTA says a station is not accessible", () => {
    const s = snap([]);
    s.stations[1] = st("b", 42.31, { wheelchairBoarding: "not_accessible" });
    expect(evaluateTrip(trip, s, NOW, {}).status).toBe("NOT_STEP_FREE");
  });

  it("is UNKNOWN when MBTA has no accessibility info for a station", () => {
    const s = snap([]);
    s.stations[1] = st("b", 42.31, { wheelchairBoarding: "unknown" });
    expect(evaluateTrip(trip, s, NOW, {}).status).toBe("UNKNOWN");
  });

  it("ignores alerts that have ended or have not started", () => {
    const ended = alert("e", "STATION_CLOSURE", ["a"], [], { activePeriod: [{ start: "2026-10-01T00:00:00Z", end: "2026-10-02T00:00:00Z" }] });
    const future = alert("f", "STATION_CLOSURE", ["a"], [], { activePeriod: [{ start: "2026-10-30T00:00:00Z", end: null }] });
    expect(evaluateTrip(trip, snap([ended, future]), NOW, {}).status).toBe("STEP_FREE");
  });
});

describe("evaluateTrip: freshness", () => {
  it("returns UNKNOWN with isStale when data is 11 minutes old", () => {
    const r = evaluateTrip(trip, snap([], { fetchedAt: "2026-10-24T15:49:00Z" }), NOW, {});
    expect(r).toMatchObject({ status: "UNKNOWN", isStale: true });
    expect(r.reasons[0]?.code).toBe("DATA_STALE");
  });

  it("returns UNKNOWN when fetchedAt is not a date", () => {
    const r = evaluateTrip(trip, snap([], { fetchedAt: "garbage" }), NOW, {});
    expect(r.status).toBe("UNKNOWN");
    expect(r.reasons[0]?.code).toBe("DATA_INVALID");
  });

  it("returns UNKNOWN for a station id that does not exist", () => {
    const r = evaluateTrip({ ...trip, destinationId: "zzz" }, snap([]), NOW, {});
    expect(r.status).toBe("UNKNOWN");
    expect(r.reasons[0]?.code).toBe("STATION_NOT_FOUND");
  });
});

describe("evaluateTrip: elevator outages (rule 4)", () => {
  const outage = alert("o", "ELEVATOR_CLOSURE", ["a"], ["a1"]);

  it("stays STEP_FREE when another verified working elevator serves the same platform", () => {
    const map: PlatformMap = { a1: entry("a", ["P1"], true), a2: entry("a", ["P1"], true), b1: entry("b", ["P1"], true) };
    const r = evaluateTrip(trip, snap([outage]), NOW, map);
    expect(r.status).toBe("STEP_FREE");
    expect(r.infoAlerts.map((a) => a.id)).toEqual(["o"]);
    expect(r.reasons.some((x) => x.code === "ELEVATOR_ALTERNATIVE_AVAILABLE")).toBe(true);
  });

  it("is NOT_STEP_FREE when the only elevator for that platform is out", () => {
    const map: PlatformMap = { a1: entry("a", ["P1"], true), a2: entry("a", ["P2"], true), b1: entry("b", ["P1"], true) };
    const r = evaluateTrip(trip, snap([outage]), NOW, map);
    expect(r.status).toBe("NOT_STEP_FREE");
    expect(r.blockingAlerts.map((a) => a.id)).toEqual(["o"]);
  });

  it("is UNKNOWN (PLATFORM_UNVERIFIED) when the broken elevator is not in the platform map", () => {
    const r = evaluateTrip(trip, snap([outage]), NOW, { a2: entry("a", ["P1"], true) });
    expect(r.status).toBe("UNKNOWN");
    expect(r.reasons.some((x) => x.code === "PLATFORM_UNVERIFIED")).toBe(true);
  });

  it("is UNKNOWN when the only alternative is unverified", () => {
    const map: PlatformMap = { a1: entry("a", ["P1"], true), a2: entry("a", ["P1"], false) };
    expect(evaluateTrip(trip, snap([outage]), NOW, map).status).toBe("UNKNOWN");
  });

  it("is UNKNOWN when the broken elevator mapping is itself unverified", () => {
    const map: PlatformMap = { a1: entry("a", ["P1"], false), a2: entry("a", ["P1"], true) };
    expect(evaluateTrip(trip, snap([outage]), NOW, map).status).toBe("UNKNOWN");
  });

  it("is UNKNOWN (never NOT_STEP_FREE) when a working elevator at the station is unmapped and might serve the platform", () => {
    const map: PlatformMap = { a1: entry("a", ["P1"], true) }; // a2 is not mapped
    expect(evaluateTrip(trip, snap([outage]), NOW, map).status).toBe("UNKNOWN");
  });

  it("is NOT_STEP_FREE when two elevators for one platform are both out", () => {
    const both = [outage, alert("o2", "ELEVATOR_CLOSURE", ["a"], ["a2"])];
    const map: PlatformMap = { a1: entry("a", ["P1"], true), a2: entry("a", ["P1"], true) };
    expect(evaluateTrip(trip, snap(both), NOW, map).status).toBe("NOT_STEP_FREE");
  });

  it("treats an outage of an elevator that is not on a subway path as information", () => {
    const map: PlatformMap = { a1: entry("a", [], true) };
    const r = evaluateTrip(trip, snap([outage]), NOW, map);
    expect(r.status).toBe("STEP_FREE");
  });
});

describe("evaluateTrip: escalators and profiles", () => {
  it("escalator outages are information only", () => {
    const r = evaluateTrip(trip, snap([alert("esc", "ESCALATOR_CLOSURE", ["a"])]), NOW, {});
    expect(r.status).toBe("STEP_FREE");
    expect(r.infoAlerts.map((a) => a.id)).toEqual(["esc"]);
  });

  const uneven = alert("u", "STATION_ISSUE", ["a"], [], { header: "The platform is unlevel and hard to board." });

  it("uneven-platform alerts block wheelchair and stroller riders", () => {
    expect(evaluateTrip(trip, snap([uneven]), NOW, {}).status).toBe("NOT_STEP_FREE");
    expect(evaluateTrip({ ...trip, profile: "stroller" }, snap([uneven]), NOW, {}).status).toBe("NOT_STEP_FREE");
  });

  it("uneven-platform alerts are still reported, but lower priority, for no_stairs", () => {
    const r = evaluateTrip({ ...trip, profile: "no_stairs" }, snap([uneven]), NOW, {});
    expect(r.status).toBe("STEP_FREE");
    expect(r.infoAlerts.map((a) => a.id)).toEqual(["u"]);
  });

  it("classifies effects", () => {
    expect(alertKind(alert("1", "STOP_CLOSURE", []))).toBe("closure");
    expect(alertKind(alert("2", "ACCESS_ISSUE", []))).toBe("access_issue");
    expect(alertKind(alert("3", "NOTICE", []))).toBe("other");
    expect(impactFor(alert("4", "STATION_ISSUE", []), "wheelchair")).toBe("info");
  });
});

describe("alternatives", () => {
  const blocked = snap([alert("x", "STATION_CLOSURE", ["a"])]);

  it("suggests the nearest verified accessible station on the same line, not an endpoint", () => {
    const r = evaluateTrip(trip, blocked, NOW, {});
    expect(r.alternative?.id).toBe("c"); // b is the destination; c is nearest remaining
  });

  it("skips stations that are themselves UNKNOWN, closed, or on another line", () => {
    const s = snap([alert("x", "STATION_CLOSURE", ["a"]), alert("y", "STATION_CLOSURE", ["c"])]);
    s.stations[3] = st("d", 42.33, { wheelchairBoarding: "unknown" });
    s.stations.push(st("e", 42.305, { lines: ["Blue"] }));
    expect(evaluateTrip(trip, s, NOW, {}).alternative).toBeNull();
  });

  it("returns up to 3, ordered by distance", () => {
    const s = snap([]);
    s.stations.push(st("e", 42.34), st("f", 42.35));
    const out = findAlternatives(s.stations[0] as Station, new Set(["b"]), "wheelchair", s, NOW.getTime(), {});
    expect(out.map((x) => x.id)).toEqual(["c", "d", "e"]);
  });

  it("returns nothing when the data is stale", () => {
    const s = snap([], { fetchedAt: "2026-10-24T12:00:00Z" });
    expect(findAlternatives(s.stations[0] as Station, new Set(), "wheelchair", s, NOW.getTime(), {})).toEqual([]);
  });
});

describe("geo", () => {
  it("haversine is ~1 km for 0.009 degrees of latitude and 0 for the same point", () => {
    expect(haversineKm({ lat: 42, lng: -71 }, { lat: 42, lng: -71 })).toBe(0);
    expect(haversineKm({ lat: 42, lng: -71 }, { lat: 42.009, lng: -71 })).toBeCloseTo(1.0, 1);
  });
});
