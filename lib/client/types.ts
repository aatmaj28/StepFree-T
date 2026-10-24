import type { Station, TripResult, UserProfile } from "@/lib/types";
import type { ExplainResponse } from "@/lib/api/schemas";

/** /api/status and /api/demo answer with a TripResult plus a few display fields. */
export interface StatusResponse extends TripResult {
  trip: { profile: UserProfile; origin: Station | null; destination: Station | null };
  simulated?: boolean;
  label?: string;
  scenario?: string;
}

export type ExplainPayload = ExplainResponse & { dataSource?: string; fetchedAt?: string };

export type DemoScenarioId = "elevator-outage-alewife" | "all-clear" | "api-down";

export const DEMO_LABELS: Record<DemoScenarioId, string> = {
  "elevator-outage-alewife": "Elevator outage at Alewife (red)",
  "all-clear": "All clear (green)",
  "api-down": "MBTA data too old (gray)",
};
