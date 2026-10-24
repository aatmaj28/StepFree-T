import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  RawAlertsResponseSchema,
  RawFacilitiesResponseSchema,
  RawStopsResponseSchema,
  DataSnapshotSchema,
} from "@/lib/data/schemas";
import {
  buildStopToStation,
  normalizeAlerts,
  normalizeFacilities,
  normalizeStations,
  wheelchairFromCode,
} from "@/lib/data/normalize";
import { isAlertActive } from "@/lib/engine/rules";

const fixture = (name: string): unknown => JSON.parse(readFileSync(path.join(__dirname, "..", "fixtures", name), "utf8"));

const platforms = RawStopsResponseSchema.parse(fixture("stops-platforms.json"));
const red = RawStopsResponseSchema.parse(fixture("stops-by-route-red.json"));
const facilities = RawFacilitiesResponseSchema.parse(fixture("facilities.json"));
const alerts = RawAlertsResponseSchema.parse(fixture("alerts.json"));

describe("MBTA fixtures match the Zod schemas", () => {
  it("parses real stops, facilities and alerts", () => {
    expect(platforms.data.length).toBeGreaterThan(0);
    expect(red.data.length).toBe(3);
    expect(facilities.data.length).toBeGreaterThan(0);
    expect(alerts.data.length).toBeGreaterThan(0);
  });

  it("the committed snapshot matches our own schema", () => {
    const text = readFileSync(path.join(process.cwd(), "lib", "data", "snapshots", "mbta-snapshot.json"), "utf8");
    const parsed = DataSnapshotSchema.parse(JSON.parse(text));
    expect(parsed.stations.length).toBeGreaterThan(100);
  });
});

describe("normalize", () => {
  it("maps wheelchair_boarding 0/1/2 to unknown/accessible/not_accessible", () => {
    expect(wheelchairFromCode(0)).toBe("unknown");
    expect(wheelchairFromCode(1)).toBe("accessible");
    expect(wheelchairFromCode(2)).toBe("not_accessible");
    expect(wheelchairFromCode(null)).toBe("unknown");
    expect(wheelchairFromCode(undefined)).toBe("unknown");
  });

  const stations = normalizeStations([{ line: "Red", response: red }], platforms);
  const stopToStation = buildStopToStation(platforms, stations);

  it("builds one station per parent, sorted by name, with lines", () => {
    expect(stations.map((s) => s.id)).toEqual(["place-alfcl", "place-davis", "place-pktrm"]);
    const alewife = stations[0];
    expect(alewife).toMatchObject({ name: "Alewife", lines: ["Red"], wheelchairBoarding: "accessible" });
    expect(typeof alewife?.lat).toBe("number");
  });

  it("resolves child platform ids to their parent station", () => {
    expect(stopToStation.get("70061")).toBe("place-alfcl");
    expect(stopToStation.get("70063")).toBe("place-davis");
    expect(stopToStation.get("70064")).toBe("place-davis");
  });

  it("deduplicates stations that appear on several lines", () => {
    const twice = normalizeStations(
      [
        { line: "Red", response: red },
        { line: "Green-B", response: red },
      ],
      platforms,
    );
    expect(twice).toHaveLength(3);
    expect(twice[0]?.lines).toEqual(["Green", "Red"]);
  });

  it("keeps only facilities at subway stations and attaches the platform map", () => {
    const ids = new Set(stations.map((s) => s.id));
    const out = normalizeFacilities(facilities, stopToStation, ids);
    const byId = new Map(out.map((f) => [f.id, f] as const));
    expect(byId.get("813")).toMatchObject({ type: "elevator", stationId: "place-alfcl", servesPlatforms: ["Platform"] });
    expect(byId.get("356")).toMatchObject({ type: "escalator", servesPlatforms: "unknown" });
    expect(byId.has("841")).toBe(false); // Forest Hills is not in this fixture's station set
  });

  const stationIds = new Set(["place-portr", "place-forhl", "place-jaksn", "place-dwnxg", "place-symcl", "place-brdwy", "place-cenav"]);
  const identity = new Map([...stationIds].map((id) => [id, id] as const));
  const facilityToStation = new Map([
    ["987", "place-portr"],
    ["842", "place-forhl"],
    ["869", "place-dwnxg"],
  ]);
  const normalized = normalizeAlerts(alerts, identity, facilityToStation, stationIds);
  const find = (id: string) => normalized.find((a) => a.id === id);

  it("extracts station and facility ids from informed_entity", () => {
    expect(find("1040925")).toMatchObject({ effect: "ELEVATOR_CLOSURE", stationIds: ["place-portr"], facilityIds: ["987"] });
    expect(find("1026060")).toMatchObject({ effect: "STATION_CLOSURE", stationIds: ["place-symcl"] });
  });

  it("treats the 1969 epoch placeholder as active-from-creation, so a NEW outage is not hidden", () => {
    const placeholder = find("1040922");
    expect(placeholder).toBeDefined();
    expect(placeholder?.activePeriod[0]?.end).toBeNull();
    expect(placeholder?.activePeriod[0]?.start.startsWith("1969")).toBe(false);
    if (placeholder) expect(isAlertActive(placeholder, Date.parse("2026-10-25T00:00:00Z"))).toBe(true);
  });

  it("drops alerts that are not about any known subway station", () => {
    const none = normalizeAlerts(alerts, new Map(), new Map(), new Set());
    expect(none).toHaveLength(0);
  });
});
