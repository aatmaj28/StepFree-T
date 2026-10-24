"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import TripForm from "@/components/TripForm";
import { loadTrip, saveTrip } from "@/lib/client/storage";
import type { Station, Trip } from "@/lib/types";

type Load = { phase: "loading" } | { phase: "error"; message: string } | { phase: "ready"; stations: Station[] };

export default function NewTripPage() {
  const router = useRouter();
  const [load, setLoad] = useState<Load>({ phase: "loading" });
  const [initial, setInitial] = useState<Trip | null>(null);

  const fetchStations = useCallback(async () => {
    setLoad({ phase: "loading" });
    try {
      const res = await fetch("/api/stations", { cache: "no-store" });
      const body = (await res.json()) as { stations?: Station[]; error?: string };
      if (!res.ok || !body.stations) throw new Error(body.error ?? `Request failed (${res.status})`);
      setLoad(body.stations.length > 0 ? { phase: "ready", stations: body.stations } : { phase: "error", message: "The station list is empty." });
    } catch (err) {
      setLoad({ phase: "error", message: err instanceof Error ? err.message : "Could not load stations." });
    }
  }, []);

  useEffect(() => {
    setInitial(loadTrip());
    void fetchStations();
  }, [fetchStations]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Save your trip</h1>
      {load.phase === "loading" ? (
        <p role="status" aria-busy="true" className="text-xl">Loading stations…</p>
      ) : null}
      {load.phase === "error" ? (
        <div className="space-y-3">
          <p role="alert" className="rounded-lg border-2 border-red-800 bg-red-50 p-3 text-lg text-red-900">
            We could not load the station list. {load.message}
          </p>
          <button type="button" onClick={() => void fetchStations()} className="inline-flex min-h-[44px] items-center rounded-lg bg-blue-800 px-5 text-lg font-bold text-white">
            Try again
          </button>
        </div>
      ) : null}
      {load.phase === "ready" ? (
        <TripForm
          stations={load.stations}
          initial={initial}
          onSave={(trip) => {
            saveTrip(trip);
            router.push("/");
          }}
        />
      ) : null}
      <p>
        <Link href="/" className="inline-flex min-h-[44px] items-center text-lg font-semibold text-blue-900 underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
