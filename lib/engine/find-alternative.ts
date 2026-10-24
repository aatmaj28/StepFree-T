import type { DataSnapshot, Station, UserProfile } from "@/lib/types";
import { PLATFORM_MAP, type PlatformMap } from "@/lib/data/platform-map";
import { haversineKm } from "./geo";
import { checkFreshness, evaluateStation } from "./rules";

/**
 * Nearest stations (straight-line distance) that share a line with `problem` and are VERIFIED step-free:
 * MBTA says accessible, no active blocking alert, and every elevator question resolved.
 * A station whose own status is UNKNOWN is never returned. Stale or invalid data returns [].
 */
export function findAlternatives(
  problem: Station,
  exclude: ReadonlySet<string>,
  profile: UserProfile,
  snapshot: DataSnapshot,
  nowMs: number,
  platformMap: PlatformMap = PLATFORM_MAP,
  limit = 3,
): Station[] {
  if (!checkFreshness(snapshot.fetchedAt, nowMs).fresh) return [];
  return snapshot.stations
    .filter((s) => s.id !== problem.id && !exclude.has(s.id))
    .filter((s) => s.lines.some((line) => problem.lines.includes(line)))
    .filter((s) => s.wheelchairBoarding === "accessible")
    .filter((s) => evaluateStation(s, profile, snapshot, nowMs, platformMap).status === "STEP_FREE")
    .map((s) => ({ station: s, km: haversineKm(problem, s) }))
    .sort((a, b) => a.km - b.km || a.station.id.localeCompare(b.station.id))
    .slice(0, limit)
    .map((x) => x.station);
}

export function findAlternative(
  problem: Station,
  exclude: ReadonlySet<string>,
  profile: UserProfile,
  snapshot: DataSnapshot,
  nowMs: number,
  platformMap: PlatformMap = PLATFORM_MAP,
): Station | null {
  return findAlternatives(problem, exclude, profile, snapshot, nowMs, platformMap, 1)[0] ?? null;
}
