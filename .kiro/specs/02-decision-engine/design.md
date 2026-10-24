# 02 Decision engine: design

```
evaluateTrip(trip, snapshot, now, platformMap = PLATFORM_MAP) -> TripResult
  1. checkFreshness(snapshot.fetchedAt, now)      stale/invalid -> UNKNOWN, stop
  2. look up origin + destination                 missing/same  -> UNKNOWN, stop
  3. evaluateStation(...) for each station        -> StationVerdict { status, reasons, blocking, info }
  4. combine: worst(NOT_STEP_FREE > UNKNOWN > STEP_FREE), dedupe alerts
  5. if not STEP_FREE: findAlternative(problem station, exclude endpoints)
```

## Files

- `rules.ts`: `alertKind`, `impactFor(alert, profile)`, `isAlertActive`, `activeAlertsForStation`, `checkFreshness`, `evaluateStation`, `worst`.
- `evaluate-trip.ts`: composes the steps above.
- `find-alternative.ts`: `findAlternatives(problem, exclude, profile, snapshot, now, map, limit)`.
- `geo.ts`: `haversineKm`.

## Alert classification

| Effect | Kind | wheelchair / stroller | no_stairs |
|---|---|---|---|
| STATION_CLOSURE, STOP_CLOSURE | closure | blocking | blocking |
| ACCESS_ISSUE | access_issue (or uneven_platform if the text says uneven/unlevel/mini-high) | blocking | blocking (uneven: info) |
| STATION_ISSUE | uneven_platform if text matches, else other | blocking / info | info |
| ELEVATOR_CLOSURE | elevator_outage | needs platform check | needs platform check |
| ESCALATOR_CLOSURE | escalator_outage | info | info |

## Elevator resolution (`resolveElevator`)

For each outaged facility that belongs to the station:
- not in map, wrong station, or `verified: false`: `unverified`.
- `platforms: []` (Commuter Rail, bus): `not_on_subway_path` (info).
- for each platform P it serves, look at elevators at the station that are not out:
  - one verified server of P: covered.
  - servers exist but none verified, or a working elevator is unmapped (it might serve P): `unverified`.
  - otherwise: `uncovered`.

`uncovered` blocks; `unverified` makes the result UNKNOWN; the rest are informational.

## Decisions

- Uncertainty always goes to UNKNOWN. An unmapped working elevator can never be used to prove an outage is fatal, and an unverified one can never prove it is covered.
- Unparseable alert dates count as active: if we cannot rule an alert out we must not drop it.
- Direction of travel is not modelled. An outage is judged on every platform the elevator serves.
- `now` and the platform map are parameters so tests are deterministic and can use synthetic maps.

## Properties (fast-check, `tests/engine/evaluate-trip.property.test.ts`)

a) active blocker on an endpoint never gives STEP_FREE; b) stale or invalid `fetchedAt` never gives STEP_FREE; c) escalator-only alerts never change the result and never block; d) filtering never drops an active alert that names a trip station; e) the alternative is accessible, unblocked, not an endpoint, and rated STEP_FREE by the engine; f) determinism; g) expired alerts never block. A coverage test checks the generators reach every status and non-null alternatives.
