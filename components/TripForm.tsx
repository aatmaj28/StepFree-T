"use client";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Flag, ArrowDownUp, Search, Accessibility, Baby, Footprints } from "lucide-react";
import type { Station, Trip, UserProfile } from "@/lib/types";
import { lineStyle } from "@/lib/client/lines";

interface Props {
  stations: Station[];
  initial?: Trip | null;
  onSave: (trip: Trip) => void;
}

const PROFILES: { value: UserProfile; label: string; hint: string; Icon: typeof Accessibility }[] = [
  { value: "wheelchair", label: "Wheelchair", hint: "Strictest checks", Icon: Accessibility },
  { value: "stroller", label: "Stroller", hint: "Elevators matter; escalators do not", Icon: Baby },
  { value: "no_stairs", label: "No stairs", hint: "Cannot use stairs", Icon: Footprints },
];

function StationPicker({
  id,
  label,
  endpoint,
  stations,
  value,
  onChange,
}: {
  id: string;
  label: string;
  endpoint: "from" | "to";
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

  const selected = stations.find((s) => s.id === value);
  const Icon = endpoint === "from" ? MapPin : Flag;
  const accent = endpoint === "from" ? "text-brand-700" : "text-ink";

  return (
    <div className="space-y-2">
      <label htmlFor={`${id}-search`} className="flex items-center gap-2 text-base font-bold text-ink">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-surface-sunken ${accent}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        {label}
      </label>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          id={`${id}-search`}
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Type to search stations"
          autoComplete="off"
          className="field pl-9"
        />
      </div>

      <select
        id={id}
        aria-label={`${label}: choose a station`}
        aria-describedby={`${id}-count`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field"
        required
      >
        <option value="">Choose a station</option>
        {shown.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.lines.join(", ")})
          </option>
        ))}
      </select>

      <div className="flex items-center justify-between">
        <p id={`${id}-count`} className="text-sm text-ink-muted" aria-live="polite">
          {shown.length} {shown.length === 1 ? "station" : "stations"} shown
        </p>
        {selected ? (
          <span className="flex flex-wrap justify-end gap-1">
            {selected.lines.map((l) => {
              const st = lineStyle(l);
              return (
                <span key={l} className={`chip px-2 py-0 text-xs ${st.bg} ${st.text}`}>
                  {l}
                </span>
              );
            })}
          </span>
        ) : null}
      </div>
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

  function swap() {
    setOriginId(destinationId);
    setDestinationId(originId);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!originId || !destinationId) return setError("Please choose both a start and an end station.");
    if (originId === destinationId) return setError("The start and end must be different stations.");
    setError(null);
    onSave({ originId, destinationId, profile });
  }

  const canSwap = Boolean(originId || destinationId);

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-base font-bold text-ink">Where are you going?</legend>
        <StationPicker id="origin" label="From" endpoint="from" stations={stations} value={originId} onChange={setOriginId} />

        <div className="flex justify-center">
          <button
            type="button"
            onClick={swap}
            disabled={!canSwap}
            aria-label="Swap start and end stations"
            className="btn-secondary h-11 w-11 rounded-full p-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowDownUp className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <StationPicker id="destination" label="To" endpoint="to" stations={stations} value={destinationId} onChange={setDestinationId} />
      </fieldset>

      <fieldset className="card space-y-2 p-5">
        <legend className="px-1 text-base font-bold text-ink">How do you travel?</legend>
        {PROFILES.map((p) => {
          const checked = profile === p.value;
          const Icon = p.Icon;
          return (
            <label
              key={p.value}
              className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors ${
                checked ? "border-brand-600 bg-brand-50" : "border-hairline bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="profile"
                value={p.value}
                checked={checked}
                onChange={() => setProfile(p.value)}
                className="h-5 w-5 accent-brand-700"
              />
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${checked ? "bg-brand-100 text-brand-800" : "bg-surface-sunken text-ink-soft"}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-base font-semibold text-ink">{p.label}</span>
                <span className="block text-sm text-ink-muted">{p.hint}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {error ? (
        <p role="alert" className="rounded-xl border-2 border-status-blocked bg-status-blocked-tint p-3 text-base font-semibold text-status-blocked">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary min-h-[56px] w-full text-lg">
        Save trip
      </button>
    </form>
  );
}
