// SIMULATED data for /api/demo ONLY. Nothing here is real MBTA data and no real route may import this file.
// It exists so a presenter can show a red state on command even when no real alert is active.
import type { Alert, DataSnapshot, Facility, Station } from "@/lib/types";
import { servedPlatforms } from "./platform-map";

export type DemoScenario = "elevator-outage-alewife" | "all-clear" | "api-down";

export const DEMO_TRIP = { originId: "place-alfcl", destinationId: "place-pktrm" } as const;

const RED = ["Red"];
const station = (id: string, name: string, lat: number, lng: number, lines: string[] = RED): Station => ({
  id,
  name,
  lines,
  wheelchairBoarding: "accessible",
  lat,
  lng,
});

const STATIONS: Station[] = [
  station("place-alfcl", "Alewife", 42.39583, -71.141287),
  station("place-davis", "Davis", 42.39674, -71.121815),
  station("place-portr", "Porter", 42.3884, -71.119149),
  station("place-harsq", "Harvard", 42.373362, -71.118956),
  station("place-cntsq", "Central", 42.365486, -71.103802),
  station("place-knncl", "Kendall/MIT", 42.36249079, -71.08617653),
  station("place-chmnl", "Charles/MGH", 42.361166, -71.070628),
  station("place-pktrm", "Park Street", 42.3563946, -71.0624242, ["Green", "Red"]),
];

const elevator = (id: string, stationId: string, name: string): Facility => ({
  id,
  stationId,
  type: "elevator",
  name,
  servesPlatforms: servedPlatforms(id),
});

const FACILITIES: Facility[] = [
  elevator("813", "place-alfcl", "Alewife Elevator 813 (Platform to main lobby)"),
  elevator("961", "place-alfcl", "Alewife Elevator 961 (Platform to Russell Field, Rindge Avenue lobby)"),
  elevator("814", "place-alfcl", "Alewife Elevator 814 (Main lobby to street, parking garage)"),
  elevator("815", "place-alfcl", "Alewife Elevator 815 (Main lobby to street, parking garage)"),
  { id: "356", stationId: "place-alfcl", type: "escalator", name: "Alewife Escalator 356 (Garage level 2 to level 4)", servesPlatforms: "unknown" },
];

function simulatedAlerts(now: Date): Alert[] {
  const since = new Date(now.getTime() - 2 * 3_600_000).toISOString();
  const base = { stationIds: ["place-alfcl"], activePeriod: [{ start: since, end: null }], severity: 3, updatedAt: since };
  return [
    {
      ...base,
      id: "demo-elevator-813",
      effect: "ELEVATOR_CLOSURE",
      header: "[SIMULATED] Alewife Elevator 813 (Platform to main lobby) is unavailable due to maintenance.",
      description: "Simulated demo alert. Not real MBTA data.",
      facilityIds: ["813"],
    },
    {
      ...base,
      id: "demo-elevator-961",
      effect: "ELEVATOR_CLOSURE",
      header: "[SIMULATED] Alewife Elevator 961 (Platform to Russell Field, Rindge Avenue lobby) is unavailable due to maintenance.",
      description: "Simulated demo alert. Not real MBTA data.",
      facilityIds: ["961"],
    },
    {
      ...base,
      id: "demo-escalator-356",
      effect: "ESCALATOR_CLOSURE",
      header: "[SIMULATED] Alewife Escalator 356 (Garage level 2 to level 4) is unavailable due to maintenance.",
      description: "Simulated demo alert. Not real MBTA data.",
      facilityIds: ["356"],
    },
  ];
}

export function buildDemoSnapshot(scenario: DemoScenario, now: Date): DataSnapshot {
  const base = { stations: STATIONS, facilities: FACILITIES, source: "demo" as const };
  switch (scenario) {
    case "all-clear":
      return { ...base, alerts: [], fetchedAt: now.toISOString() };
    case "elevator-outage-alewife":
      return { ...base, alerts: simulatedAlerts(now), fetchedAt: now.toISOString() };
    case "api-down":
      // The last good copy is 3 hours old: the engine must refuse to call it step-free.
      return { ...base, alerts: [], fetchedAt: new Date(now.getTime() - 3 * 3_600_000).toISOString() };
  }
}
