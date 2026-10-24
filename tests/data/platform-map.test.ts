import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PLATFORM_MAP } from "@/lib/data/platform-map";
import { DataSnapshotSchema } from "@/lib/data/schemas";

const snapshot = DataSnapshotSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "lib", "data", "snapshots", "mbta-snapshot.json"), "utf8")),
);

const DEMO_STATIONS = [
  "place-alfcl", "place-davis", "place-portr", "place-harsq", "place-cntsq", "place-knncl", "place-chmnl", "place-pktrm",
  "place-dwnxg", "place-sstat", "place-jaksn", "place-forhl", "place-gover", "place-state", "place-haecl", "place-north",
];

describe("platform-map against the real committed facilities", () => {
  const elevators = new Map(snapshot.facilities.filter((f) => f.type === "elevator").map((f) => [f.id, f] as const));

  it("every mapped id is a real elevator at the station the map claims", () => {
    for (const [id, entry] of Object.entries(PLATFORM_MAP)) {
      const real = elevators.get(id);
      expect(real, `facility ${id} should exist`).toBeDefined();
      expect(real?.stationId, `facility ${id} station`).toBe(entry.stationId);
    }
  });

  it("every real elevator at the 16 demo stations has a map entry (nothing silently unmapped)", () => {
    const unmapped = [...elevators.values()].filter((f) => DEMO_STATIONS.includes(f.stationId) && !PLATFORM_MAP[f.id]);
    expect(unmapped.map((f) => `${f.id} ${f.name}`)).toEqual([]);
  });

  it("covers all 16 demo stations", () => {
    const covered = new Set(Object.values(PLATFORM_MAP).map((e) => e.stationId));
    for (const id of DEMO_STATIONS) expect(covered.has(id), id).toBe(true);
  });

  it("platform names within a station are consistent strings (no stray whitespace)", () => {
    for (const e of Object.values(PLATFORM_MAP)) for (const p of e.platforms) expect(p).toBe(p.trim());
  });

  it("has both verified and unverified entries (nothing is blindly marked verified)", () => {
    const values = Object.values(PLATFORM_MAP);
    expect(values.some((e) => e.verified)).toBe(true);
    expect(values.some((e) => !e.verified)).toBe(true);
  });
});
