// Plan B on the map: the adapter only ever presents the engine's own alternative (a problem now) and
// planB()'s backups (if an elevator breaks). It never invents a station, and the two never appear together.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { buildDemoSnapshot, demoTrip, type DemoScenario } from "@/lib/data/demo-snapshot";
import { buildTripPayload } from "@/lib/api/trip-payload";
import { stationStatuses } from "@/lib/engine/station-map";
import { alternativeAction, alternativeFromResult, backupsFromPlanB, backupStations, NO_ALTERNATIVE_MESSAGE } from "@/lib/client/alternative-view";
import type { StatusResponse } from "@/lib/client/types";
import type { DataSnapshot, Trip } from "@/lib/types";
import type { PlatformMap } from "@/lib/data/platform-map";
import { mixedAlertsArb, NOW, platformMapArb, snapshotArb, tripArb } from "../engine/arbitraries";

function response(trip: Trip, snap: DataSnapshot, now: Date, map?: PlatformMap): StatusResponse {
  return { ...buildTripPayload(trip, snap, now, map), stations: stationStatuses(snap, trip.profile, now, map) };
}

const now = new Date();
const demo = (scenario: DemoScenario) => response({ ...demoTrip(scenario), profile: "wheelchair" }, buildDemoSnapshot(scenario, now), now);

describe("alternativeFromResult on the demo scenarios", () => {
  it("elevator outage: Alewife is the original, Davis the engine's alternative", () => {
    const v = alternativeFromResult(demo("elevator-outage-alewife"));
    expect(v.kind).toBe("suggested");
    if (v.kind !== "suggested") return;
    expect(v.original).toMatchObject({ id: "place-alfcl", name: "Alewife", role: "origin", status: "NOT_STEP_FREE" });
    expect(v.original.issue).toContain("Elevator");
    expect(v.alternative).toMatchObject({ id: "place-davis", name: "Davis", status: "STEP_FREE", sharedLines: ["Red"] });
    expect(v.why).toContain("straight-line");
    expect(v.why).toContain("not checked the trip between");
    expect(alternativeAction(v)).toEqual({ type: "setOrigin", id: "place-davis" });
  });

  it("all clear needs no Plan B; stale data gets the honest no-alternative message", () => {
    expect(alternativeFromResult(demo("all-clear")).kind).toBe("not-needed");
    expect(alternativeFromResult(demo("api-down"))).toEqual({ kind: "none", message: NO_ALTERNATIVE_MESSAGE });
  });
});

describe("alternativeFromResult never invents a Plan B", () => {
  it("suggests a station only when the engine returned it, and it is exactly that station", () => {
    fc.assert(
      fc.property(snapshotArb(mixedAlertsArb), tripArb, platformMapArb, (snap, trip, map) => {
        const r = response(trip, snap, NOW, map);
        const v = alternativeFromResult(r);
        if (v.kind === "suggested") {
          expect(r.alternative?.id).toBe(v.alternative.id);
          expect([trip.originId, trip.destinationId]).toContain(v.original.id);
          expect([trip.originId, trip.destinationId]).not.toContain(v.alternative.id);
        }
        if (!r.alternative && r.status !== "STEP_FREE") expect(v.kind).toBe("none");
      }),
    );
  });
});

describe("backupsFromPlanB only presents planB()", () => {
  it("plan-b-davis: Davis Elevator 816 is the single point of failure and Porter its backup", () => {
    const backups = backupsFromPlanB(demo("plan-b-davis"));
    expect(backups).toHaveLength(1);
    expect(backups[0]).toMatchObject({ facilityId: "816", at: { id: "place-davis", name: "Davis", role: "origin" }, backup: { id: "place-portr", name: "Porter", status: "STEP_FREE", sharedLines: ["Red"] } });
    expect([...backupStations(backups).keys()]).toEqual(["place-portr"]);
  });

  it("is empty for a trip with a problem now (the engine alternative applies instead)", () => {
    expect(backupsFromPlanB(demo("elevator-outage-alewife"))).toEqual([]);
    expect(backupsFromPlanB(demo("api-down"))).toEqual([]);
  });

  it("every backup is exactly a planB() station for a no-backup elevator at a trip end, never an endpoint", () => {
    fc.assert(
      fc.property(snapshotArb(mixedAlertsArb), tripArb, platformMapArb, (snap, trip, map) => {
        const r = response(trip, snap, NOW, map);
        const backups = backupsFromPlanB(r);
        const spofs = (r.planB?.elevators ?? []).filter((e) => e.role === "no_backup");
        expect(backups.map((b) => b.facilityId)).toEqual(spofs.map((e) => e.facilityId));
        backups.forEach((b, i) => {
          expect(b.backup?.id ?? null).toBe(spofs[i]?.alternative?.id ?? null);
          expect([trip.originId, trip.destinationId]).toContain(b.at.id);
          if (b.backup) expect([trip.originId, trip.destinationId]).not.toContain(b.backup.id);
        });
      }),
      { numRuns: 300 },
    );
  });

  it("the current alternative and Plan B backups never appear for the same result", () => {
    fc.assert(
      fc.property(snapshotArb(mixedAlertsArb), tripArb, platformMapArb, (snap, trip, map) => {
        const r = response(trip, snap, NOW, map);
        const now = alternativeFromResult(r).kind === "suggested";
        const later = backupsFromPlanB(r).some((b) => b.backup !== null);
        expect(now && later).toBe(false);
      }),
      { numRuns: 300 },
    );
  });
});
