// Generators for the engine property tests. Fully synthetic data: tests are the only place fake data is allowed.
import fc from "fast-check";
import type { Alert, DataSnapshot, Facility, Station, Trip, UserProfile } from "@/lib/types";
import type { PlatformMap } from "@/lib/data/platform-map";

export const NOW = new Date("2026-10-24T16:00:00.000Z");
export const NOW_MS = NOW.getTime();
const MIN = 60_000;
const HOUR = 60 * MIN;

export const STATION_IDS = ["s0", "s1", "s2", "s3", "s4", "s5"] as const;
export const BLOCKING_EFFECTS = ["STATION_CLOSURE", "STOP_CLOSURE", "ACCESS_ISSUE"] as const;
export const OTHER_EFFECTS = ["ELEVATOR_CLOSURE", "ESCALATOR_CLOSURE", "STATION_ISSUE", "NOTICE"] as const;

export const profileArb: fc.Arbitrary<UserProfile> = fc.constantFrom("wheelchair", "stroller", "no_stairs");

const stationArb = (id: string): fc.Arbitrary<Station> =>
  fc.record({
    id: fc.constant(id),
    name: fc.constant(`Station ${id}`),
    lines: fc.subarray(["Red", "Blue"], { minLength: 1 }),
    wheelchairBoarding: fc.constantFrom("accessible", "accessible", "accessible", "not_accessible", "unknown"),
    lat: fc.double({ min: 42.3, max: 42.4, noNaN: true }),
    lng: fc.double({ min: -71.2, max: -71.0, noNaN: true }),
  });

const facilityArb = (stationId: string, index: number): fc.Arbitrary<Facility> =>
  fc.record({
    id: fc.constant(`${stationId}-f${index}`),
    stationId: fc.constant(stationId),
    type: fc.constantFrom("elevator", "escalator"),
    name: fc.constant(`Facility ${stationId}-f${index}`),
    servesPlatforms: fc.constant("unknown" as const),
  });

/** start/end offsets in hours relative to NOW. null end = open ended. */
export interface PeriodSpec {
  startH: number;
  endH: number | null;
}

export const activePeriodSpec: fc.Arbitrary<PeriodSpec> = fc
  .record({ startH: fc.integer({ min: -72, max: -1 }), len: fc.integer({ min: 2, max: 100 }), open: fc.boolean() })
  .map(({ startH, len, open }) => ({ startH, endH: open ? null : Math.max(startH + len, 1) }));

export const expiredPeriodSpec: fc.Arbitrary<PeriodSpec> = fc
  .record({ startH: fc.integer({ min: -200, max: -50 }), len: fc.integer({ min: 1, max: 40 }) })
  .map(({ startH, len }) => ({ startH, endH: startH + len }));

const anyPeriodSpec: fc.Arbitrary<PeriodSpec> = fc.oneof(activePeriodSpec, expiredPeriodSpec, fc.record({
  startH: fc.integer({ min: 1, max: 48 }),
  endH: fc.constant<number | null>(null),
}));

export function periodFromSpec(spec: PeriodSpec): { start: string; end: string | null } {
  return {
    start: new Date(NOW_MS + spec.startH * HOUR).toISOString(),
    end: spec.endH === null ? null : new Date(NOW_MS + spec.endH * HOUR).toISOString(),
  };
}

export const alertArb = (
  effects: readonly string[],
  periods: fc.Arbitrary<PeriodSpec> = anyPeriodSpec,
  facilityIds: string[] = [],
): fc.Arbitrary<Alert> =>
  fc.record({
    id: fc.uuid(),
    effect: fc.constantFrom(...effects),
    header: fc.constant("Something happened"),
    description: fc.constant(""),
    stationIds: fc.subarray([...STATION_IDS], { minLength: 1, maxLength: 3 }),
    facilityIds: facilityIds.length > 0 ? fc.subarray(facilityIds, { maxLength: 2 }) : fc.constant([] as string[]),
    activePeriod: fc.array(periods.map(periodFromSpec), { minLength: 1, maxLength: 2 }),
    severity: fc.integer({ min: 1, max: 9 }),
    updatedAt: fc.constant(NOW.toISOString()),
  });

const allFacilityIds = STATION_IDS.flatMap((s) => [0, 1].map((i) => `${s}-f${i}`));

export const stationsArb: fc.Arbitrary<Station[]> = fc.tuple(...STATION_IDS.map((id) => stationArb(id)));

export const facilitiesArb: fc.Arbitrary<Facility[]> = fc
  .tuple(...STATION_IDS.flatMap((s) => [0, 1].map((i) => facilityArb(s, i))))
  .map((all) => all.filter((_, i) => i % 3 !== 2));

/** Platform map matching the generated facilities: random platforms, random verified flags. */
export const platformMapArb: fc.Arbitrary<PlatformMap> = fc
  .array(
    fc.record({
      platforms: fc.subarray(["A", "B"], { minLength: 0 }),
      verified: fc.boolean(),
    }),
    { minLength: allFacilityIds.length, maxLength: allFacilityIds.length },
  )
  .map((entries) =>
    Object.fromEntries(
      allFacilityIds.map((id, i) => [id, { stationId: id.split("-")[0] ?? "", ...(entries[i] ?? { platforms: [], verified: false }) }]),
    ),
  );

export const freshFetchedAt: fc.Arbitrary<string> = fc
  .integer({ min: 0, max: 9 })
  .map((m) => new Date(NOW_MS - m * MIN).toISOString());

export const snapshotArb = (alerts: fc.Arbitrary<Alert[]>): fc.Arbitrary<DataSnapshot> =>
  fc.record({
    stations: stationsArb,
    facilities: facilitiesArb,
    alerts,
    fetchedAt: freshFetchedAt,
    source: fc.constantFrom("live", "snapshot", "demo"),
  });

export const mixedAlertsArb: fc.Arbitrary<Alert[]> = fc.array(
  alertArb([...BLOCKING_EFFECTS, ...OTHER_EFFECTS], anyPeriodSpec, allFacilityIds),
  { maxLength: 8 },
);

export const tripArb: fc.Arbitrary<Trip> = fc
  .record({
    originId: fc.constantFrom(...STATION_IDS),
    destinationId: fc.constantFrom(...STATION_IDS),
    profile: profileArb,
  })
  .filter((t) => t.originId !== t.destinationId);
