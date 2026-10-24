# 02 Decision engine: requirements (EARS)

Owner: Tanishq. Scope: `evaluateTrip`, profile rules, alternatives. Pure functions, no I/O.

1. THE engine SHALL return `STEP_FREE` only when the data is fresh, both stations are `accessible` per MBTA, no active blocking alert affects either station, and every elevator outage is covered by a verified working elevator on the same platform.
2. IF `fetchedAt` is missing, not a valid date, or more than 10 minutes (`STALE_AFTER_MINUTES`) older than `now`, THEN THE engine SHALL return `UNKNOWN` with `isStale: true` and no alternative.
3. IF a trip station is not in the snapshot, or the two stations are the same, THEN THE engine SHALL return `UNKNOWN` with reason `STATION_NOT_FOUND` or `SAME_STATION`.
4. WHEN a station's `wheelchairBoarding` is `not_accessible`, THE engine SHALL return `NOT_STEP_FREE`; WHEN it is `unknown`, THE engine SHALL return `UNKNOWN`.
5. THE engine SHALL count an alert only while `now` is inside one of its `activePeriod` ranges; an expired or not-yet-started alert SHALL NOT block.
6. WHEN an active `STATION_CLOSURE`, `STOP_CLOSURE` or `ACCESS_ISSUE` alert names a trip station, THE engine SHALL report `NOT_STEP_FREE`.
7. WHEN an active `ELEVATOR_CLOSURE` alert names a trip station, THE engine SHALL check whether another working elevator serves each platform the broken elevator serves.
8. IF every such platform has a working, verified alternative, THEN THE alert SHALL be informational and the station SHALL stay usable.
9. IF a platform has no alternative and every working elevator at the station is mapped, THEN THE engine SHALL report `NOT_STEP_FREE` with code `ELEVATOR_NO_ALTERNATIVE`.
10. IF the broken elevator is unmapped or unverified, OR the only alternative is unverified, OR a working elevator at the station is unmapped, THEN THE engine SHALL report `UNKNOWN` with code `PLATFORM_UNVERIFIED`.
11. THE engine SHALL treat escalator outages as information only for every profile.
12. WHERE the profile is `wheelchair` or `stroller`, THE engine SHALL treat uneven-platform alerts as blocking; WHERE the profile is `no_stairs`, THE engine SHALL report them as information.
13. THE engine SHALL combine the two station verdicts so that `NOT_STEP_FREE` outranks `UNKNOWN`, and `UNKNOWN` outranks `STEP_FREE`.
14. THE engine SHALL place every active alert that names a trip station in either `blockingAlerts` or `infoAlerts`.
15. WHEN the status is not `STEP_FREE` and the data is fresh, THE engine SHALL suggest the nearest (haversine) station that shares a line with the problem station, is `accessible`, has status `STEP_FREE`, and is not a trip endpoint; IF none exists, THEN THE alternative SHALL be `null`.
16. THE engine SHALL be deterministic: the same trip, snapshot, time and platform map always give the same result.
