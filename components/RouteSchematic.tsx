import { MapPin, Flag, ArrowRight } from "lucide-react";
import type { AccessStatus, Station } from "@/lib/types";
import { commonLine, lineStyle } from "@/lib/client/lines";

interface Props {
  origin: Station | null;
  destination: Station | null;
  status: AccessStatus;
  alternative?: Station | null;
}

/**
 * A transit-line SCHEMATIC — not a geographic map. It shows the origin -> destination
 * relationship and the shared line colour, without implying exact geography, track path,
 * or travel time. A full text equivalent is provided for assistive technology; the schematic
 * SVG itself is aria-hidden.
 */
export default function RouteSchematic({ origin, destination, status, alternative }: Props) {
  if (!origin || !destination) return null;

  const line = commonLine(origin.lines, destination.lines);
  const style = line ? lineStyle(line) : null;
  const stroke = style?.hex ?? "#334155";
  const lineLabel = style?.label ?? "the subway";

  const dotClass =
    status === "STEP_FREE"
      ? "text-status-free"
      : status === "NOT_STEP_FREE"
        ? "text-status-blocked"
        : "text-status-unknown";

  const textEquivalent = `Trip from ${origin.name} to ${destination.name} on ${lineLabel}.${
    alternative ? ` Suggested accessible alternative: ${alternative.name}.` : ""
  }`;

  return (
    <section aria-label="Trip route" className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Your route</h3>
        {style ? (
          <span className={`chip ${style.bg} ${style.text}`}>
            <span className="h-2 w-2 rounded-full bg-white/90" aria-hidden="true" />
            {style.label}
          </span>
        ) : null}
      </div>

      {/* Text equivalent, always present even if the schematic is hidden/unsupported. */}
      <p className="sr-only">{textEquivalent}</p>

      <ol className="relative flex items-stretch justify-between gap-2" aria-hidden="true">
        {/* connecting line */}
        <div
          className="absolute left-5 right-5 top-5 h-1.5 rounded-full"
          style={{ backgroundColor: stroke }}
        />
        <li className="relative z-10 flex flex-1 flex-col items-start">
          <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card ring-2 ${dotClass}`} style={{ color: stroke }}>
            <MapPin className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">From</span>
          <span className="text-base font-bold text-ink">{origin.name}</span>
        </li>
        <li className="relative z-10 flex items-center self-start pt-2">
          <ArrowRight className="h-5 w-5 text-ink-muted" strokeWidth={2.5} />
        </li>
        <li className="relative z-10 flex flex-1 flex-col items-end text-right">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card ring-2" style={{ color: stroke }}>
            <Flag className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">To</span>
          <span className="text-base font-bold text-ink">{destination.name}</span>
        </li>
      </ol>

      {alternative ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-status-free-tint px-3 py-2 text-sm font-medium text-status-free">
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          Accessible alternative nearby: <span className="font-bold">{alternative.name}</span>
        </p>
      ) : null}
    </section>
  );
}
