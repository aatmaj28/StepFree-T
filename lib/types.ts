// Shared contract between data layer, engine, API and UI. Change with care: every layer imports this.

export type UserProfile = "wheelchair" | "stroller" | "no_stairs";
export type AccessStatus = "STEP_FREE" | "NOT_STEP_FREE" | "UNKNOWN";
export type WheelchairBoarding = "accessible" | "not_accessible" | "unknown";
export type DataSource = "live" | "snapshot" | "demo";

export interface Station {
  id: string;
  name: string;
  lines: string[];
  wheelchairBoarding: WheelchairBoarding;
  lat: number;
  lng: number;
}

export interface Facility {
  id: string;
  stationId: string;
  type: "elevator" | "escalator";
  name: string;
  servesPlatforms: string[] | "unknown";
}

export interface ActivePeriod {
  start: string;
  end: string | null;
}

export interface Alert {
  id: string;
  effect: string;
  header: string;
  description: string;
  stationIds: string[];
  facilityIds: string[];
  activePeriod: ActivePeriod[];
  severity: number;
  updatedAt: string;
}

export interface DataSnapshot {
  stations: Station[];
  facilities: Facility[];
  alerts: Alert[];
  fetchedAt: string;
  source: DataSource;
}

export interface Trip {
  originId: string;
  destinationId: string;
  profile: UserProfile;
}

export interface Reason {
  code: string;
  stationId: string;
  message: string;
}

export interface TripResult {
  status: AccessStatus;
  reasons: Reason[];
  blockingAlerts: Alert[];
  infoAlerts: Alert[];
  alternative: Station | null;
  dataSource: DataSource;
  fetchedAt: string;
  isStale: boolean;
}

export const STALE_AFTER_MINUTES = 10;
