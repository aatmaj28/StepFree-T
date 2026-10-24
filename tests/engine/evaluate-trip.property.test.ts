import { describe, expect, it } from "vitest";
import fc from "fast-check";
import type { Alert, DataSnapshot } from "@/lib/types";
import { STALE_AFTER_MINUTES } from "@/lib/types";
import { evaluateTrip } from "@/lib/engine/evaluate-trip";
import { activeAlertsForStation, evaluateStation, isAlertActive } from "@/lib/engine/rules";
import {
  BLOCKING_EFFECTS,
  NOW,
  NOW_MS,
  activePeriodSpec,
  alertArb,
  expiredPeriodSpec,
  mixedAlertsArb,
  platformMapArb,
  snapshotArb,
  tripArb,
} from "./arbitraries";

const RUNS = { numRuns: 300 };

describe("decision engine properties", () => {
  it("a) an active closure/blocking alert on an endpoint is never STEP_FREE", () => {
    fc.assert(
      fc.property(
        tripArb,
        platformMapArb,
        snapshotArb(mixedAlertsArb),
        alertArb(BLOCKING_EFFECTS, activePeriodSpec),
        fc.boolean(),
        (trip, map, snap, blocker, useOrigin) => {
          const target = useOrigin ? trip.originId : trip.destinationId;
          const withBlocker: DataSnapshot = { ...snap, alerts: [...snap.alerts, { ...blocker, stationIds: [target] }] };
          expect(evaluateTrip(trip, withBlocker, NOW, map).status).not.toBe("STEP_FREE");
        },
      ),
      RUNS,
    );
  });

  it("b) stale or invalid fetchedAt is never STEP_FREE", () => {
    const staleOrInvalid = fc.oneof(
      fc.integer({ min: STALE_AFTER_MINUTES + 1, max: 100_000 }).map((m) => new Date(NOW_MS - m * 60_000).toISOString()),
      fc.constantFrom("", "not a date", "2026-13-45T99:00:00Z", "yesterday"),
    );
    fc.assert(
      fc.property(tripArb, platformMapArb, snapshotArb(mixedAlertsArb), staleOrInvalid, (trip, map, snap, fetchedAt) => {
        const result = evaluateTrip(trip, { ...snap, fetchedAt }, NOW, map);
        expect(result.status).toBe("UNKNOWN");
        expect(result.isStale).toBe(true);
        expect(result.alternative).toBeNull();
      }),
      RUNS,
    );
  });

  it("b2) data exactly at the limit is still fresh, one minute past is stale", () => {
    fc.assert(
      fc.property(tripArb, platformMapArb, snapshotArb(fc.constant([])), (trip, map, snap) => {
        const atLimit = new Date(NOW_MS - STALE_AFTER_MINUTES * 60_000).toISOString();
        const past = new Date(NOW_MS - (STALE_AFTER_MINUTES * 60_000 + 60_000)).toISOString();
        expect(evaluateTrip(trip, { ...snap, fetchedAt: atLimit }, NOW, map).isStale).toBe(false);
        expect(evaluateTrip(trip, { ...snap, fetchedAt: past }, NOW, map).isStale).toBe(true);
      }),
      RUNS,
    );
  });

  it("c) escalator-only alerts never turn STEP_FREE into NOT_STEP_FREE", () => {
    fc.assert(
      fc.property(
        tripArb,
        platformMapArb,
        snapshotArb(fc.constant([])),
        fc.array(alertArb(["ESCALATOR_CLOSURE"], activePeriodSpec), { minLength: 1, maxLength: 6 }),
        (trip, map, clean, escalators) => {
          const before = evaluateTrip(trip, clean, NOW, map);
          const after = evaluateTrip(trip, { ...clean, alerts: escalators }, NOW, map);
          expect(after.status).toBe(before.status);
          if (before.status === "STEP_FREE") expect(after.status).toBe("STEP_FREE");
          expect(after.blockingAlerts).toHaveLength(0);
        },
      ),
      RUNS,
    );
  });

  it("d) filtering never drops an active alert that references a trip station", () => {
    fc.assert(
      fc.property(tripArb, platformMapArb, snapshotArb(mixedAlertsArb), (trip, map, snap) => {
        for (const stationId of [trip.originId, trip.destinationId]) {
          const expected = snap.alerts.filter((a) => a.stationIds.includes(stationId) && isAlertActive(a, NOW_MS));
          const found = activeAlertsForStation(snap.alerts, stationId, NOW_MS);
          expect(found.map((a) => a.id).sort()).toEqual(expected.map((a) => a.id).sort());
        }
        const result = evaluateTrip(trip, snap, NOW, map);
        const reported = new Set([...result.blockingAlerts, ...result.infoAlerts].map((a) => a.id));
        for (const stationId of [trip.originId, trip.destinationId]) {
          for (const a of activeAlertsForStation(snap.alerts, stationId, NOW_MS)) expect(reported.has(a.id)).toBe(true);
        }
      }),
      RUNS,
    );
  });

  it("e) the alternative is accessible, unblocked, and never a trip endpoint", () => {
    fc.assert(
      fc.property(tripArb, platformMapArb, snapshotArb(mixedAlertsArb), (trip, map, snap) => {
        const { alternative } = evaluateTrip(trip, snap, NOW, map);
        if (!alternative) return;
        expect([trip.originId, trip.destinationId]).not.toContain(alternative.id);
        const station = snap.stations.find((s) => s.id === alternative.id);
        expect(station?.wheelchairBoarding).toBe("accessible");
        const hardBlockers = snap.alerts.filter(
          (a: Alert) =>
            a.stationIds.includes(alternative.id) &&
            isAlertActive(a, NOW_MS) &&
            (BLOCKING_EFFECTS as readonly string[]).includes(a.effect),
        );
        expect(hardBlockers).toHaveLength(0);
        // The engine's own station check must agree: the alternative is verified step-free.
        expect(station && evaluateStation(station, trip.profile, snap, NOW_MS, map).status).toBe("STEP_FREE");
      }),
      RUNS,
    );
  });

  it("f) the same inputs always give the same output", () => {
    fc.assert(
      fc.property(tripArb, platformMapArb, snapshotArb(mixedAlertsArb), (trip, map, snap) => {
        const a = evaluateTrip(trip, snap, NOW, map);
        const b = evaluateTrip(structuredClone(trip), structuredClone(snap), new Date(NOW_MS), map);
        expect(b).toEqual(a);
      }),
      RUNS,
    );
  });

  it("g) an expired alert never blocks", () => {
    fc.assert(
      fc.property(
        tripArb,
        platformMapArb,
        snapshotArb(fc.constant([])),
        alertArb(["STATION_CLOSURE", "STOP_CLOSURE", "ACCESS_ISSUE", "ELEVATOR_CLOSURE"], expiredPeriodSpec),
        (trip, map, clean, expired) => {
          const alert = { ...expired, stationIds: [trip.originId, trip.destinationId] };
          const before = evaluateTrip(trip, clean, NOW, map);
          const after = evaluateTrip(trip, { ...clean, alerts: [alert] }, NOW, map);
          expect(after.blockingAlerts).toHaveLength(0);
          expect(after.status).toBe(before.status);
        },
      ),
      RUNS,
    );
  });
});
