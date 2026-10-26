// Journey map route behaviour: /api/network, and the additive map fields on /api/status and /api/demo.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCache } from "@/lib/data/cache";
import { buildDemoSnapshot } from "@/lib/data/demo-snapshot";
import { GET as status } from "@/app/api/status/route";
import { GET as demo } from "@/app/api/demo/route";
import { GET as network } from "@/app/api/network/route";
import { DEMO_SCENARIOS } from "@/lib/client/types";

const get = (path: string) => new Request(`http://test.local${path}`);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
const json = async (res: Response): Promise<Json> => res.json();

beforeEach(() => {
  clearCache();
  process.env.FORCE_OFFLINE = "1";
});
afterEach(() => {
  vi.useRealTimers();
  delete process.env.FORCE_OFFLINE;
});

describe("/api/network", () => {
  it("serves the committed MBTA geometry offline, labelled as reference snapshot data", async () => {
    const res = await network();
    const body = await json(res);
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ kind: "reference", dataSource: "snapshot" });
    expect(body.note).toContain("not a verified itinerary");
    expect(body.lines.length).toBeGreaterThanOrEqual(9);
    expect(typeof body.fetchedAt).toBe("string");
  });
});

describe("/api/status map fields", () => {
  it("keeps the trip payload and adds journey, station markers and their alerts", async () => {
    const body = await json(await status(get("/api/status?origin=place-alfcl&destination=place-pktrm&profile=wheelchair")));
    for (const k of ["status", "reasons", "blockingAlerts", "infoAlerts", "alternative", "dataSource", "fetchedAt", "isStale", "trip", "planB", "laterToday"]) {
      expect(body).toHaveProperty(k);
    }
    expect(body.journey).toEqual({ kind: "direct", lines: ["Red"] });
    expect(body.stations.length).toBeGreaterThan(100);
    expect(Array.isArray(body.stationAlerts)).toBe(true);
  });

  it("names the transfer station for a two-line trip, without changing the verdict", async () => {
    const body = await json(await status(get("/api/status?origin=place-alfcl&destination=place-ogmnl&profile=wheelchair")));
    expect(body.journey.kind).toBe("transfer");
    expect(body.journey.transferStations.map((s: Json) => s.name)).toContain("Downtown Crossing");
    expect(body).not.toHaveProperty("display");
  });

  it("a real-data response is never labelled demo, and the stale snapshot makes every marker gray", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(Date.now() + 24 * 3_600_000) });
    const body = await json(await status(get("/api/status?origin=place-alfcl&destination=place-pktrm&profile=wheelchair")));
    expect(body.dataSource).toBe("snapshot");
    expect(body.simulated).toBeUndefined();
    expect(body.stations.every((s: Json) => s.status === "UNKNOWN")).toBe(true);
  });
});

describe("/api/demo map fields", () => {
  it("every scenario is labelled simulated, and its markers are only demo stations", async () => {
    const demoIds = new Set(buildDemoSnapshot("all-clear", new Date()).stations.map((s) => s.id));
    for (const scenario of DEMO_SCENARIOS) {
      const body = await json(await demo(get(`/api/demo?scenario=${scenario}`)));
      expect(body).toMatchObject({ dataSource: "demo", simulated: true, label: "Simulated demo data", scenario });
      expect(body.journey.kind).toBe("direct");
      expect(body.stations.every((s: Json) => demoIds.has(s.id))).toBe(true);
    }
  });

  it("the outage scenario turns Alewife red on the map and keeps Davis as the alternative", async () => {
    const body = await json(await demo(get("/api/demo?scenario=elevator-outage-alewife")));
    expect(body.stations.find((s: Json) => s.id === "place-alfcl").status).toBe("NOT_STEP_FREE");
    expect(body.stations.find((s: Json) => s.id === "place-davis").status).toBe("STEP_FREE");
    expect(body.alternative.id).toBe("place-davis");
  });
});
