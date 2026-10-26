// How origin and destination connect on the network (drives the map's route emphasis and transfer stations).
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { routeRelationship, type LineMembership } from "@/lib/engine/journey";
import { readNetworkFile } from "@/lib/data/network";

// Random networks: a list of lines over 8 stations.
const networkArb: fc.Arbitrary<LineMembership[]> = fc.array(
  fc.record({ line: fc.constantFrom("A", "B", "C", "D"), stationIds: fc.subarray(["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7"], { minLength: 2 }) }),
  { maxLength: 6 },
);
const idArb = fc.constantFrom("s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "nope");

describe("routeRelationship", () => {
  it("direct only when a line really contains both stations, and reports only those lines", () => {
    fc.assert(
      fc.property(networkArb, idArb, idArb, (net, a, b) => {
        const r = routeRelationship(a, b, net);
        if (r.kind === "direct") {
          for (const line of r.lines) {
            const members = new Set(net.filter((p) => p.line === line).flatMap((p) => p.stationIds));
            expect(members.has(a) && members.has(b)).toBe(true);
          }
        }
      }),
    );
  });

  it("transfer stations are on a line through each end", () => {
    fc.assert(
      fc.property(networkArb, idArb, idArb, (net, a, b) => {
        const r = routeRelationship(a, b, net);
        if (r.kind !== "transfer") return;
        const on = (line: string) => new Set(net.filter((p) => p.line === line).flatMap((p) => p.stationIds));
        for (const t of r.transferStationIds) {
          expect(r.originLines.some((l) => on(l).has(t))).toBe(true);
          expect(r.destinationLines.some((l) => on(l).has(t))).toBe(true);
        }
      }),
    );
  });

  it("no network or a station outside it is unknown, never direct", () => {
    expect(routeRelationship("s0", "s1", null)).toEqual({ kind: "unknown", reason: "NO_NETWORK" });
    expect(routeRelationship("s0", "zz", [{ line: "A", stationIds: ["s0", "s1"] }]).kind).toBe("unknown");
  });
});

describe("routeRelationship on the committed MBTA network (real data)", () => {
  it("knows real direct, transfer and unsupported trips", async () => {
    const net = await readNetworkFile();
    expect(routeRelationship("place-alfcl", "place-pktrm", net.patterns)).toEqual({ kind: "direct", lines: ["Red"] });
    const toOakGrove = routeRelationship("place-alfcl", "place-ogmnl", net.patterns);
    expect(toOakGrove.kind).toBe("transfer");
    if (toOakGrove.kind === "transfer") expect(toOakGrove.transferStationIds).toContain("place-dwnxg");
    // Red to Blue needs two changes: not supported, so it must not be called direct or a single transfer.
    expect(routeRelationship("place-alfcl", "place-wondl", net.patterns).kind).toBe("unknown");
  });
});
