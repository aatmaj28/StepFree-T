"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Alert, Trip } from "@/lib/types";
import AlertCard from "@/components/AlertCard";
import AlternativeCard from "@/components/AlternativeCard";
import DataSourceBadge from "@/components/DataSourceBadge";
import StatusBanner from "@/components/StatusBanner";
import { useDemoScenario } from "@/lib/client/demo-store";
import { loadTrip } from "@/lib/client/storage";
import { useStatus } from "@/lib/client/use-status";
import type { ExplainPayload, StatusResponse } from "@/lib/client/types";

const btn = "inline-flex min-h-[44px] items-center justify-center rounded-lg px-5 text-lg font-bold";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "unknown time" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function problemStationName(result: StatusResponse): string | undefined {
  const reason = result.reasons.find((r) => r.code !== "VERIFIED_STEP_FREE" && !r.code.startsWith("ESCALATOR") && !r.code.startsWith("ELEVATOR_ALTERNATIVE"));
  const stations = [result.trip.origin, result.trip.destination];
  return stations.find((s) => s?.id === reason?.stationId)?.name;
}

/** Notices that get the same plain-language text (for example several broken escalators) become one card. */
function groupByText(alerts: Alert[], text: Map<string, string>): { alert: Alert; count: number }[] {
  const groups = new Map<string, { alert: Alert; count: number }>();
  for (const a of alerts) {
    const key = text.get(a.id) ?? `id:${a.id}`;
    const found = groups.get(key);
    if (found) found.count += 1;
    else groups.set(key, { alert: a, count: 1 });
  }
  return [...groups.values()];
}

function Result({ result, explanation, checkedAt, onRefresh }: { result: StatusResponse; explanation: ExplainPayload | null; checkedAt: string; onRefresh: () => void }) {
  const text = new Map(explanation?.explanations.map((e) => [e.alertId, e.text] as const));
  const route = result.trip.origin && result.trip.destination ? `${result.trip.origin.name} to ${result.trip.destination.name}` : undefined;
  const reasons = result.reasons.filter((r) => r.code !== "VERIFIED_STEP_FREE" || result.status === "STEP_FREE");
  return (
    <div className="space-y-5">
      <div aria-live="polite" className="space-y-4">
        <StatusBanner status={result.status} routeLabel={route} headline={explanation?.summary} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <DataSourceBadge source={result.dataSource} fetchedAt={result.fetchedAt} />
        <p className="text-base text-slate-800">
          Last checked {formatTime(checkedAt)}. MBTA data from {formatTime(result.fetchedAt)}.
        </p>
      </div>

      {result.dataSource === "demo" ? (
        <p role="note" className="rounded-lg border-2 border-violet-800 bg-violet-50 p-3 text-lg font-semibold text-violet-900">
          Simulated demo data. This is not what is happening in the subway right now.
        </p>
      ) : null}
      {result.dataSource === "snapshot" ? (
        <p role="note" className="rounded-lg border-2 border-amber-800 bg-amber-50 p-3 text-lg font-semibold text-amber-900">
          We could not reach the MBTA, so this uses a saved copy from {formatTime(result.fetchedAt)}. It is not live. Press Refresh to try again.
        </p>
      ) : null}

      {result.alternative ? <AlternativeCard station={result.alternative} instead={problemStationName(result)} /> : null}

      {result.blockingAlerts.length > 0 ? (
        <section aria-labelledby="blocking-h">
          <h3 id="blocking-h" className="mb-2 text-2xl font-bold">Problems on your trip</h3>
          <ul className="space-y-3">
            {groupByText(result.blockingAlerts, text).map(({ alert, count }) => (
              <AlertCard key={alert.id} alert={alert} blocking count={count} explanation={text.get(alert.id)} />
            ))}
          </ul>
        </section>
      ) : null}

      {result.infoAlerts.length > 0 ? (
        <section aria-labelledby="info-h">
          <h3 id="info-h" className="mb-2 text-2xl font-bold">Other notices</h3>
          <ul className="space-y-3">
            {groupByText(result.infoAlerts, text).map(({ alert, count }) => (
              <AlertCard key={alert.id} alert={alert} blocking={false} count={count} explanation={text.get(alert.id)} />
            ))}
          </ul>
        </section>
      ) : null}

      {reasons.length > 0 ? (
        <section aria-labelledby="why-h">
          <h3 id="why-h" className="mb-2 text-2xl font-bold">Why we say this</h3>
          <ul className="list-disc space-y-1 pl-6 text-lg">
            {reasons.map((r, i) => (
              <li key={`${r.code}-${r.stationId}-${i}`}>{r.message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <button type="button" onClick={onRefresh} className={`${btn} w-full bg-blue-800 text-white hover:bg-blue-900`}>
        Refresh
      </button>
    </div>
  );
}

export default function HomePage() {
  const demo = useDemoScenario();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setTrip(loadTrip());
    setLoaded(true);
  }, []);
  const { state, refresh } = useStatus(trip, demo);

  if (!loaded) return <p aria-busy="true" className="text-lg">Loading…</p>;

  if (!trip && !demo) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-extrabold">Is your trip step-free right now?</h1>
        <p className="text-xl">Save your trip once. We check live MBTA data and tell you in plain words.</p>
        <Link href="/trip/new" className={`${btn} w-full bg-blue-800 text-white hover:bg-blue-900`}>
          Set up your trip
        </Link>
        <p className="text-base text-slate-700">No trip yet? Turn on Demo mode at the bottom of the page to see how it looks.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Your trip</h1>
      {state.phase === "loading" || state.phase === "idle" ? (
        <p role="status" aria-busy="true" className="rounded-xl bg-white p-6 text-xl shadow-sm">
          Checking the latest MBTA information…
        </p>
      ) : null}
      {state.phase === "error" ? (
        <div className="space-y-4">
          <div aria-live="polite">
            <StatusBanner status="UNKNOWN" headline="We could not check your trip. Press Refresh to try again. If it keeps failing, ask a station worker before you go." />
          </div>
          <p role="alert" className="rounded-lg border-2 border-red-800 bg-red-50 p-3 text-lg text-red-900">
            Problem: {state.message}
          </p>
          <button type="button" onClick={refresh} className={`${btn} w-full bg-blue-800 text-white hover:bg-blue-900`}>
            Refresh
          </button>
        </div>
      ) : null}
      {state.phase === "ready" ? (
        <Result result={state.result} explanation={state.explanation} checkedAt={state.checkedAt} onRefresh={refresh} />
      ) : null}
    </div>
  );
}
