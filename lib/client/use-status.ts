"use client";
import { useCallback, useEffect, useState } from "react";
import type { Trip } from "@/lib/types";
import type { DemoScenarioId, ExplainPayload, StatusResponse } from "./types";

export type StatusState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; result: StatusResponse; explanation: ExplainPayload | null; checkedAt: string };

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

/** Loads the trip status (real or demo), then the plain-language explanation. Explanation failure never hides the status. */
export function useStatus(trip: Trip | null, demo: DemoScenarioId | null): { state: StatusState; refresh: () => void } {
  const [state, setState] = useState<StatusState>({ phase: "idle" });
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  const originId = trip?.originId;
  const destinationId = trip?.destinationId;
  const profile = trip?.profile;

  useEffect(() => {
    const controller = new AbortController();
    const url = demo
      ? `/api/demo?scenario=${demo}`
      : originId && destinationId && profile
        ? `/api/status?${new URLSearchParams({ origin: originId, destination: destinationId, profile }).toString()}`
        : null;
    if (!url) {
      setState({ phase: "idle" });
      return () => controller.abort();
    }
    setState({ phase: "loading" });
    (async () => {
      try {
        const result = await getJson<StatusResponse>(url, { signal: controller.signal });
        const explainProfile = demo ? "wheelchair" : profile ?? "wheelchair";
        // The map fields (every station's marker) are not part of the TripResult the explainer reads.
        const { stations, stationAlerts, journey, ...tripResult } = result;
        let explanation: ExplainPayload | null = null;
        try {
          explanation = await getJson<ExplainPayload>("/api/explain", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ tripResult, profile: explainProfile }),
            signal: controller.signal,
          });
        } catch {
          explanation = null;
        }
        if (!controller.signal.aborted) setState({ phase: "ready", result, explanation, checkedAt: new Date().toISOString() });
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({ phase: "error", message: err instanceof Error ? err.message : "Something went wrong." });
      }
    })();
    return () => controller.abort();
  }, [originId, destinationId, profile, demo, tick]);

  return { state, refresh };
}

/** Station network geometry for the map, fetched once per page load. */
export interface NetworkLine {
  id: string;
  routeId: string;
  line: string;
  name: string;
  coordinates: [number, number][];
  stationIds: string[];
}
export type NetworkState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; lines: NetworkLine[]; dataSource: string; fetchedAt: string };

let networkPromise: Promise<NetworkState> | null = null;

export function useNetwork(): NetworkState {
  const [state, setState] = useState<NetworkState>({ phase: "loading" });
  useEffect(() => {
    let alive = true;
    networkPromise ??= getJson<{ lines: NetworkLine[]; dataSource: string; fetchedAt: string }>("/api/network")
      .then((b): NetworkState => ({ phase: "ready", lines: b.lines, dataSource: b.dataSource, fetchedAt: b.fetchedAt }))
      .catch((e: unknown): NetworkState => {
        networkPromise = null; // allow a retry on the next mount
        return { phase: "error", message: e instanceof Error ? e.message : "Line geometry unavailable" };
      });
    void networkPromise.then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
