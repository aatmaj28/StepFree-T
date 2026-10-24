"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  RefreshCw,
  Radio,
  MessageSquareText,
  ShieldCheck,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";
import type { Alert, Trip } from "@/lib/types";
import AlertCard from "@/components/AlertCard";
import AlternativeCard from "@/components/AlternativeCard";
import DataSourceBadge from "@/components/DataSourceBadge";
import StatusBanner from "@/components/StatusBanner";
import RouteSchematic from "@/components/RouteSchematic";
import StatusSkeleton from "@/components/StatusSkeleton";
import { useDemoScenario } from "@/lib/client/demo-store";
import { loadTrip } from "@/lib/client/storage";
import { useStatus } from "@/lib/client/use-status";
import type { ExplainPayload, StatusResponse } from "@/lib/client/types";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "unknown time"
    : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function problemStationName(result: StatusResponse): string | undefined {
  const reason = result.reasons.find(
    (r) =>
      r.code !== "VERIFIED_STEP_FREE" &&
      !r.code.startsWith("ESCALATOR") &&
      !r.code.startsWith("ELEVATOR_ALTERNATIVE"),
  );
  const stations = [result.trip.origin, result.trip.destination];
  return stations.find((s) => s?.id === reason?.stationId)?.name;
}

/** Notices with identical plain-language text become one card. */
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

function Result({
  result,
  explanation,
  checkedAt,
  onRefresh,
}: {
  result: StatusResponse;
  explanation: ExplainPayload | null;
  checkedAt: string;
  onRefresh: () => void;
}) {
  const text = new Map(explanation?.explanations.map((e) => [e.alertId, e.text] as const));
  const route =
    result.trip.origin && result.trip.destination
      ? `${result.trip.origin.name} to ${result.trip.destination.name}`
      : undefined;
  const reasons = result.reasons.filter(
    (r) => r.code !== "VERIFIED_STEP_FREE" || result.status === "STEP_FREE",
  );
  const usedAI = explanation?.usedAI === true;

  return (
    <div className="grid gap-5 lg:grid-cols-5 lg:items-start">
      {/* Primary column: the verdict first (critical info first on mobile). */}
      <div className="space-y-5 lg:col-span-3">
        <div aria-live="polite">
          <StatusBanner status={result.status} routeLabel={route} headline={explanation?.summary} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DataSourceBadge source={result.dataSource} fetchedAt={result.fetchedAt} />
          {usedAI ? (
            <span className="chip border border-brand-200 bg-brand-50 px-3 py-1.5 text-brand-800">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              AI explained
            </span>
          ) : null}
          <p className="text-sm text-ink-muted">
            Checked {formatTime(checkedAt)} · MBTA data {formatTime(result.fetchedAt)}
          </p>
        </div>

        {result.dataSource === "demo" ? (
          <p
            role="note"
            className="rounded-xl border-2 border-violet-300 bg-violet-50 p-3 font-semibold text-violet-900"
          >
            Simulated demo data. This is not what is happening in the subway right now.
          </p>
        ) : null}
        {result.dataSource === "snapshot" ? (
          <p
            role="note"
            className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 font-semibold text-amber-900"
          >
            We could not reach the MBTA, so this uses a saved copy from {formatTime(result.fetchedAt)}.
            It is not live. Press Refresh to try again.
          </p>
        ) : null}

        {result.blockingAlerts.length > 0 ? (
          <section aria-labelledby="blocking-h">
            <h3 id="blocking-h" className="mb-2 text-xl font-bold text-ink">
              Problems on your trip
            </h3>
            <ul className="space-y-3">
              {groupByText(result.blockingAlerts, text).map(({ alert, count }) => (
                <AlertCard key={alert.id} alert={alert} blocking count={count} explanation={text.get(alert.id)} />
              ))}
            </ul>
          </section>
        ) : null}

        {result.infoAlerts.length > 0 ? (
          <section aria-labelledby="info-h">
            <h3 id="info-h" className="mb-2 text-xl font-bold text-ink">
              Other notices
            </h3>
            <ul className="space-y-3">
              {groupByText(result.infoAlerts, text).map(({ alert, count }) => (
                <AlertCard key={alert.id} alert={alert} blocking={false} count={count} explanation={text.get(alert.id)} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {/* Secondary column: route, alternative, reasoning, refresh. */}
      <aside className="space-y-5 lg:col-span-2">
        <RouteSchematic
          origin={result.trip.origin}
          destination={result.trip.destination}
          status={result.status}
          alternative={result.alternative}
        />

        {result.alternative ? (
          <AlternativeCard station={result.alternative} instead={problemStationName(result)} />
        ) : null}

        {reasons.length > 0 ? (
          <section aria-labelledby="why-h" className="card p-5">
            <h3 id="why-h" className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Why we say this
            </h3>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
              {reasons.map((r, i) => (
                <li key={`${r.code}-${r.stationId}-${i}`}>{r.message}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <button type="button" onClick={onRefresh} className="btn-primary w-full">
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
          Refresh
        </button>
      </aside>
    </div>
  );
}

const VALUE_PROPS = [
  {
    Icon: Radio,
    title: "Live accessibility updates",
    body: "We read the MBTA's live elevator and alert data the moment you check.",
  },
  {
    Icon: MessageSquareText,
    title: "Clear trip-level guidance",
    body: "One plain-language verdict for your whole trip — no jargon, no guesswork.",
  },
  {
    Icon: ShieldCheck,
    title: "Verified alternatives",
    body: "When a station is blocked, we suggest a nearby accessible stop on the same line.",
  },
];

const STEPS = [
  { n: 1, title: "Save your trip", body: "Pick a start, an end, and how you travel." },
  { n: 2, title: "We check live data", body: "Stations, elevators, and alerts in real time." },
  { n: 3, title: "Get a clear answer", body: "Step-free, not step-free, or cannot confirm." },
];

function Landing() {
  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div className="animate-fade-in space-y-5">
          <span className="chip border border-brand-200 bg-brand-50 px-3 py-1 text-brand-800">
            <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden="true" />
            Real-time MBTA accessibility
          </span>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
            Your journey. <span className="text-brand-700">Without barriers.</span>
          </h1>
          <p className="max-w-prose text-lg text-ink-soft">
            Know whether your MBTA subway trip is step-free before you travel. AccessPath AI reads
            live accessibility data and tells you in plain words.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/trip/new" className="btn-primary px-6 text-lg">
              Plan an accessible trip
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
          <p className="text-sm text-ink-muted">
            No trip yet? Turn on presenter demo mode at the bottom of the page to see how it looks.
          </p>
        </div>

        {/* Transit-inspired schematic (decorative, with hidden label). */}
        <div className="card animate-fade-in p-6 sm:p-8">
          <p className="sr-only">
            Illustration of a step-free route from an origin station to a destination station.
          </p>
          <div aria-hidden="true" className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mbta-red text-white shadow-card">
                <RouteIcon className="h-5 w-5" />
              </span>
              <div className="h-1.5 flex-1 rounded-full bg-mbta-red" />
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mbta-green text-white shadow-card">
                <RouteIcon className="h-5 w-5" />
              </span>
            </div>
            <div className="space-y-3">
              {[
                { c: "bg-status-free", w: "w-full", t: "Alewife — step-free" },
                { c: "bg-status-unknown", w: "w-5/6", t: "Davis — checking elevators" },
                { c: "bg-status-blocked", w: "w-2/3", t: "Porter — elevator outage" },
              ].map((row) => (
                <div key={row.t} className="flex items-center gap-3">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${row.c}`} />
                  <span className={`h-9 rounded-xl bg-surface-sunken ${row.w}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="vp-h">
        <h2 id="vp-h" className="sr-only">
          What AccessPath AI does
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {VALUE_PROPS.map(({ Icon, title, body }) => (
            <div key={title} className="card p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-lg font-bold text-ink">{title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="hiw-h" className="card p-6 sm:p-8">
        <h2 id="hiw-h" className="text-xl font-bold text-ink">
          How it works
        </h2>
        <ol className="mt-4 grid gap-5 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
                {s.n}
              </span>
              <span>
                <span className="block font-bold text-ink">{s.title}</span>
                <span className="block text-sm text-ink-soft">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
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

  if (!loaded) return <StatusSkeleton />;

  if (!trip && !demo) return <Landing />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Your trip</h1>
        <Link href="/trip/new" className="btn-ghost text-sm">
          Edit trip
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {state.phase === "loading" || state.phase === "idle" ? <StatusSkeleton /> : null}

      {state.phase === "error" ? (
        <div className="space-y-4">
          <div aria-live="polite">
            <StatusBanner
              status="UNKNOWN"
              headline="We could not check your trip. Press Refresh to try again. If it keeps failing, ask a station worker before you go."
            />
          </div>
          <p
            role="alert"
            className="rounded-xl border-2 border-status-blocked bg-status-blocked-tint p-3 text-base text-status-blocked"
          >
            Problem: {state.message}
          </p>
          <button type="button" onClick={refresh} className="btn-primary w-full">
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
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
