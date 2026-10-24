# 01 MBTA data: requirements (EARS)

Owner: Himani. Scope: fetching, normalizing, caching and snapshotting MBTA V3 subway data.

1. WHEN the system needs data, THE data layer SHALL request stops, facilities and alerts from `https://api-v3.mbta.com` for subway routes only (route_type 0 and 1: Red, Orange, Blue, Green, Mattapan).
2. WHERE the `MBTA_API_KEY` environment variable is set, THE client SHALL send it in the `x-api-key` header; OTHERWISE THE client SHALL send no key.
3. WHEN an MBTA request takes longer than 5 seconds, THE client SHALL abort it with an `AbortController`.
4. IF an MBTA request fails with a network error, a timeout or a 5xx status, THEN THE client SHALL retry it exactly once.
5. IF MBTA answers with a 4xx status (for example 429 rate limit), THEN THE client SHALL NOT retry and SHALL raise an `MbtaError`.
6. WHEN a response does not match its Zod schema, THE client SHALL raise an `MbtaError` instead of passing unchecked data on.
7. THE normalizer SHALL map `wheelchair_boarding` 1 to `accessible`, 2 to `not_accessible`, and 0, null or missing to `unknown`.
8. THE normalizer SHALL resolve child platform stops to their parent station and SHALL deduplicate stations by parent station id.
9. THE normalizer SHALL extract station ids and facility ids from each alert `informed_entity`, and SHALL drop alerts that name no subway station.
10. WHEN an alert's `active_period` start and end are both the Unix epoch placeholder, THE normalizer SHALL treat the alert as active from its `created_at` with no end.
11. WHILE a cached response is younger than 60 seconds, THE cache SHALL return it without calling MBTA.
12. WHEN several callers request the same key at once, THE cache SHALL make one upstream request and share the result.
13. WHEN a live fetch succeeds and the filesystem is writable, THE snapshot module SHALL write `lib/data/snapshots/mbta-snapshot.json`; IF the write fails, THEN THE module SHALL ignore the error.
14. IF the live fetch fails or `FORCE_OFFLINE=1`, THEN THE snapshot module SHALL load the committed snapshot and mark `source: "snapshot"` while keeping its original `fetchedAt`.
15. IF both the live fetch and the committed snapshot fail, THEN THE snapshot module SHALL raise `DataUnavailableError`.
16. THE platform map SHALL list, for each mapped elevator, the platforms it serves and a `verified` flag, and SHALL carry a prominent warning that a teammate must hand-verify it.
17. WHERE an elevator is not in the platform map, THE data layer SHALL expose `servesPlatforms: "unknown"`.
