# 02 Decision engine: tasks

- [x] `lib/types.ts` shared contract and `STALE_AFTER_MINUTES = 10`
- [x] `geo.ts` haversine
- [x] `rules.ts`: alert kinds, profile impact, activity window, freshness, station verdict, elevator resolution
- [x] `evaluate-trip.ts`: freshness gate, station lookup, verdict combination, alternative
- [x] `find-alternative.ts`: nearest verified station on the same line, never an endpoint, never UNKNOWN
- [x] Property test a) blocker never STEP_FREE
- [x] Property test b) stale or invalid data never STEP_FREE
- [x] Property test c) escalator-only alerts never change a result
- [x] Property test d) filtering never drops an active alert for a trip station
- [x] Property test e) alternative is accessible, unblocked, not an endpoint
- [x] Property test f) determinism
- [x] Property test g) expired alerts never block
- [x] Generator coverage test (no vacuous properties)
- [x] Example tests: elevator covered / uncovered / unmapped / unverified, profiles, freshness, alternatives
- [ ] Model direction of travel so a one-platform outage does not affect a rider who never uses that platform
- [ ] Model transfers (out of scope for the hackathon)
