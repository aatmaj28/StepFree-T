// How the origin and destination connect on the subway network, for the journey map. Pure: no I/O, no clock.
// The decision engine (evaluate-trip.ts) checks ONLY the origin and destination stations, so transfer
// stations found here are shown on the map as "not checked".

/** Minimal view of the network this module needs (decoupled from the data layer's types). */
export interface LineMembership {
  line: string;
  stationIds: readonly string[];
}

export type RouteRelationship =
  | { kind: "direct"; lines: string[] }
  | { kind: "transfer"; originLines: string[]; destinationLines: string[]; transferStationIds: string[] }
  | { kind: "unknown"; reason: "NO_NETWORK" | "STATION_NOT_IN_NETWORK" | "NO_SINGLE_TRANSFER" };

/** line -> set of station ids, merged across all patterns and directions of that line. */
export function stationsByLine(patterns: readonly LineMembership[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const p of patterns) {
    const set = out.get(p.line) ?? new Set<string>();
    for (const id of p.stationIds) set.add(id);
    out.set(p.line, set);
  }
  return out;
}

export function routeRelationship(
  originId: string,
  destinationId: string,
  patterns: readonly LineMembership[] | null,
): RouteRelationship {
  if (!patterns || patterns.length === 0) return { kind: "unknown", reason: "NO_NETWORK" };
  const byLine = stationsByLine(patterns);
  const linesOf = (id: string) => [...byLine].filter(([, set]) => set.has(id)).map(([line]) => line).sort();
  const originLines = linesOf(originId);
  const destinationLines = linesOf(destinationId);
  if (originLines.length === 0 || destinationLines.length === 0) {
    return { kind: "unknown", reason: "STATION_NOT_IN_NETWORK" };
  }

  const shared = originLines.filter((l) => destinationLines.includes(l));
  if (shared.length > 0) return { kind: "direct", lines: shared };

  const transfer = new Set<string>();
  for (const a of originLines) {
    for (const b of destinationLines) {
      for (const id of byLine.get(a) ?? []) if (byLine.get(b)?.has(id)) transfer.add(id);
    }
  }
  if (transfer.size === 0) return { kind: "unknown", reason: "NO_SINGLE_TRANSFER" };
  return { kind: "transfer", originLines, destinationLines, transferStationIds: [...transfer].sort() };
}
