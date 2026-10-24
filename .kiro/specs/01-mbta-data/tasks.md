# 01 MBTA data: tasks

- [x] Read the Swagger docs and real responses for stops, alerts and facilities
- [x] Save trimmed real responses to `tests/fixtures/` (stops-platforms, stops-by-route-red, facilities, alerts)
- [x] Write lenient Zod schemas from the fixtures (`lib/data/schemas.ts`)
- [x] `mbta-client.ts`: subway-only fetches, optional `x-api-key`, 5 s abort, one retry, no retry on 4xx, pagination via `links.next`
- [x] `normalize.ts`: wheelchair mapping, parent-station resolution, dedupe, informed_entity extraction, epoch-placeholder fix
- [x] `cache.ts`: 60 s TTL, in-flight de-duplication, shared via `globalThis`
- [x] `snapshot.ts`: write after live success (ignore write errors), fall back to committed file, `DataUnavailableError`, `FORCE_OFFLINE`
- [x] `scripts/refresh-snapshots.ts` and `npm run snapshots`; run it and commit the real snapshot
- [x] `platform-map.ts` for the 16 demo stations, with `verified` flags and the hand-verify warning
- [x] Tests: schemas vs fixtures, normalization, cache, client (key header, retry, timeout, 429), platform-map vs real facilities
- [ ] A teammate walks or photographs the 16 stations and flips `verified` flags in `platform-map.ts`
- [ ] Extend the platform map beyond the 16 demo stations
- [ ] Replace the 8-request refresh with a cheaper line lookup if the keyless limit is a problem in production
