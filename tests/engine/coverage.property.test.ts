import { it, expect } from "vitest";
import fc from "fast-check";
import { evaluateTrip } from "@/lib/engine/evaluate-trip";
import { NOW, mixedAlertsArb, platformMapArb, snapshotArb, tripArb } from "./arbitraries";

// Guards against vacuous properties: the generators must actually reach every outcome.
it("generators reach STEP_FREE, NOT_STEP_FREE, UNKNOWN and non-null alternatives", () => {
  const counts = { STEP_FREE: 0, NOT_STEP_FREE: 0, UNKNOWN: 0, alt: 0 };
  fc.assert(
    fc.property(tripArb, platformMapArb, snapshotArb(mixedAlertsArb), (trip, map, snap) => {
      const r = evaluateTrip(trip, snap, NOW, map);
      counts[r.status] += 1;
      if (r.alternative) counts.alt += 1;
    }),
    { numRuns: 1000 },
  );
  expect(counts.STEP_FREE).toBeGreaterThan(20);
  expect(counts.NOT_STEP_FREE).toBeGreaterThan(20);
  expect(counts.UNKNOWN).toBeGreaterThan(20);
  expect(counts.alt).toBeGreaterThan(20);
});
