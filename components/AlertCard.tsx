import { Ban, Info, ChevronDown } from "lucide-react";
import type { Alert } from "@/lib/types";

interface Props {
  alert: Alert;
  explanation?: string | undefined;
  blocking: boolean;
  /** How many MBTA notices share this exact explanation (shown as one card). */
  count?: number;
}

export default function AlertCard({ alert, explanation, blocking, count = 1 }: Props) {
  const accent = blocking ? "border-l-status-blocked" : "border-l-slate-400";
  const Icon = blocking ? Ban : Info;
  const iconWrap = blocking
    ? "bg-status-blocked-tint text-status-blocked"
    : "bg-surface-sunken text-ink-soft";
  const labelCls = blocking ? "text-status-blocked" : "text-ink-soft";

  return (
    <li className={`card animate-fade-in border-l-4 ${accent} p-4`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconWrap}`}>
          {/* Icon is redundant with the text label; hidden from AT. */}
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold uppercase tracking-wide ${labelCls}`}>
            {blocking ? "Blocks your trip" : "Good to know"}
            {count > 1 ? ` · ${count} notices like this` : ""}
          </p>
          <p className="mt-1 text-base leading-snug text-ink">{explanation ?? alert.header}</p>

          {explanation && alert.header ? (
            <details className="group mt-2">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-brand-800 hover:text-brand-900">
                <ChevronDown
                  className="h-4 w-4 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
                Original MBTA notice
              </summary>
              <p className="mt-2 rounded-lg bg-surface-sunken p-3 text-sm text-ink-soft">
                {alert.header}
              </p>
            </details>
          ) : null}
        </div>
      </div>
    </li>
  );
}
