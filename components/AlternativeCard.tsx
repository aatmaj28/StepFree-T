import { CheckCircle2, TrainFront } from "lucide-react";
import type { Station } from "@/lib/types";
import { lineStyle } from "@/lib/client/lines";

interface Props {
  station: Station;
  instead?: string | undefined;
}

export default function AlternativeCard({ station, instead }: Props) {
  return (
    <section
      aria-labelledby="alt-heading"
      className="card animate-fade-in overflow-hidden border-status-free/30"
    >
      <div className="flex items-center gap-2 bg-status-free-tint px-4 py-2.5">
        <CheckCircle2 className="h-5 w-5 text-status-free" aria-hidden="true" />
        <h3 id="alt-heading" className="text-sm font-bold uppercase tracking-wide text-status-free">
          Try this station instead
        </h3>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-ink-soft">
            <TrainFront className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-2xl font-extrabold text-ink">{station.name}</p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {station.lines.map((l) => {
            const s = lineStyle(l);
            return (
              <span key={l} className={`chip ${s.bg} ${s.text}`}>
                {s.label}
              </span>
            );
          })}
        </div>

        <p className="mt-3 text-base text-ink-soft">
          {instead ? `Use ${station.name} instead of ${instead}. ` : ""}
          The MBTA lists it as accessible, and we found no problems there just now.
        </p>
      </div>
    </section>
  );
}
