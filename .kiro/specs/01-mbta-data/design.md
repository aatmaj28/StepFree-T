# 01 MBTA data: design

## Real API facts found while building (verified against api-v3.mbta.com on 2026-10-24)

- `GET /stops?filter[route_type]=0,1&filter[location_type]=1` returns an EMPTY list (the two filters do not combine). We use:
  - `GET /stops?filter[route]=<routes>&include=parent_station` once per line to get parent stations (location_type 1) and the line they belong to. Green = `Green-B,Green-C,Green-D,Green-E`.
  - `GET /stops?filter[route_type]=0,1&include=parent_station` to map each platform stop id (for example `70061`) to its parent station.
- `GET /facilities?filter[type]=ELEVATOR,ESCALATOR&include=stop` returns about 420 facilities, including Commuter Rail ones. `relationships.stop` is the parent station. The facility name (`long_name`) is the only place that says which platform it serves, and `properties` holds hundreds of `excludes-stop` entries.
- `GET /alerts?filter[route_type]=0,1&filter[activity]=USING_WHEELCHAIR,USING_ESCALATOR,BOARD,EXIT,RIDE`. The accessibility activities alone miss station closures (activities BOARD/EXIT/RIDE). Effects seen: `ELEVATOR_CLOSURE`, `ESCALATOR_CLOSURE`, `STATION_CLOSURE`, `ACCESS_ISSUE`, `STATION_ISSUE`, plus delay/suspension noise that we drop.
- `informed_entity` entries carry `stop` (a platform id, a `place-` id, or a `door-` id), `facility`, `activities`, `route_type`.
- NEW alerts can have `active_period` start = end = `1969-12-31T19:00:00-05:00` (epoch 0). Read literally that is "expired".
- The keyless rate limit is 20 requests per minute (`x-ratelimit-limit: 20`). One full refresh is 8 requests, so the 60 s cache matters.

## Modules

```
mbta-client.ts   fetch + timeout + 1 retry + Zod parse  ->  Raw*Response
normalize.ts     Raw bundle -> DataSnapshot (stations, facilities, alerts)
platform-map.ts  facility id -> { stationId, platforms[], verified }
cache.ts         TTL cache + in-flight de-dup, kept on globalThis (shared by all route bundles)
snapshot.ts      getSnapshot(): live (cached) -> committed file -> DataUnavailableError
schemas.ts       lenient Zod schemas (passthrough) + schema for our own snapshot file
```

## Decisions

- Stations come from per-line queries so each station knows its lines; a station on two lines (Government Center) merges into one record.
- The snapshot keeps its original `fetchedAt`. The engine therefore treats an old snapshot as stale and answers UNKNOWN. This is deliberate.
- The cache lives on `globalThis` because Next compiles each route separately; a module-level `Map` would give each route its own cache.
- Snapshot reads use `fs` on the committed file, and `next.config.mjs` adds `outputFileTracingIncludes` so Vercel ships it.
- `platform-map.ts` is built by reading real facility names. `verified: true` means the name names the platform explicitly (or the station has one platform stop). A test checks every mapped id exists in the committed snapshot at the right station.
