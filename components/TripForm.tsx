"use client";
import { useEffect, useMemo, useState } from "react";
import type { Station, Trip, UserProfile } from "@/lib/types";

interface Props {
  stations: Station[];
  initial?: Trip | null;
  onSave: (trip: Trip) => void;
}

const PROFILES: { value: UserProfile; label: string; hint: string }[] = [
  { value: "wheelchair", label: "Wheelchair", hint: "Strictest checks" },
  { value: "stroller", label: "Stroller", hint: "Elevators matter; escalators do not" },
  { value: "no_stairs", label: "No stairs", hint: "Cannot use stairs" },
];

function StationPicker({
  id,
  label,
  stations,
  value,
  onChange,
}: {
  id: string;
  label: string;
  stations: Station[];
  value: string;
  onChange: (next: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const matches = q ? stations.filter((s) => s.name.toLowerCase().includes(q)) : stations;
    const selected = stations.find((s) => s.id === value);
    return selected && !matches.some((s) => s.id === selected.id) ? [selected, ...matches] : matches;
  }, [filter, stations, value]);

  return (
    <div className="space-y-2">
      <label htmlFor={`${id}-search`} className="block text-xl font-bold">
        {label}
      </label>
      <input
        id={`${id}-search`}
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Type to search stations"
        autoComplete="off"
        className="w-full rounded-lg border-2 border-slate-600 bg-white px-3 text-lg"
      />
      <select
        id={id}
        aria-label={`${label}: choose a station`}
        aria-describedby={`${id}-count`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border-2 border-slate-600 bg-white px-3 text-lg"
        required
      >
        <option value="">Choose a station</option>
        {shown.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.lines.join(", ")})
          </option>
        ))}
      </select>
      <p id={`${id}-count`} className="text-base text-slate-700" aria-live="polite">
        {shown.length} {shown.length === 1 ? "station" : "stations"} shown
      </p>
    </div>
  );
}

export default function TripForm({ stations, initial, onSave }: Props) {
  const [originId, setOriginId] = useState(initial?.originId ?? "");
  const [destinationId, setDestinationId] = useState(initial?.destinationId ?? "");
  const [profile, setProfile] = useState<UserProfile>(initial?.profile ?? "wheelchair");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setOriginId(initial.originId);
      setDestinationId(initial.destinationId);
      setProfile(initial.profile);
    }
  }, [initial]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!originId || !destinationId) return setError("Please choose both a start and an end station.");
    if (originId === destinationId) return setError("The start and end must be different stations.");
    setError(null);
    onSave({ originId, destinationId, profile });
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <StationPicker id="origin" label="Start station" stations={stations} value={originId} onChange={setOriginId} />
      <StationPicker id="destination" label="End station" stations={stations} value={destinationId} onChange={setDestinationId} />

      <fieldset className="space-y-2">
        <legend className="text-xl font-bold">How do you travel?</legend>
        {PROFILES.map((p) => (
          <label key={p.value} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border-2 border-slate-600 bg-white p-3">
            <input type="radio" name="profile" value={p.value} checked={profile === p.value} onChange={() => setProfile(p.value)} className="h-6 w-6" />
            <span>
              <span className="block text-lg font-semibold">{p.label}</span>
              <span className="block text-base text-slate-700">{p.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {error ? (
        <p role="alert" className="rounded-lg border-2 border-red-800 bg-red-50 p-3 text-lg font-semibold text-red-900">
          {error}
        </p>
      ) : null}

      <button type="submit" className="min-h-[56px] w-full rounded-xl bg-blue-800 px-6 text-xl font-bold text-white hover:bg-blue-900">
        Save trip
      </button>
    </form>
  );
}
