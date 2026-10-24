import type { AccessStatus } from "@/lib/types";

interface Props {
  status: AccessStatus;
  headline?: string;
  routeLabel?: string;
}

// Color is never the only signal: every state has an icon AND text.
// Background/text pairs: green-800/white 7.1:1, red-800/white 8.3:1, gray-700/white 10.3:1 (all above WCAG AA 4.5:1).
const STYLES: Record<AccessStatus, { box: string; label: string; icon: string; aria: string }> = {
  STEP_FREE: { box: "bg-green-800 text-white", label: "Step-free", icon: "check", aria: "Step-free trip" },
  NOT_STEP_FREE: { box: "bg-red-800 text-white", label: "Not step-free", icon: "cross", aria: "Not a step-free trip" },
  UNKNOWN: { box: "bg-gray-700 text-white", label: "Cannot confirm", icon: "question", aria: "Cannot confirm a step-free trip" },
};

function Icon({ kind }: { kind: string }) {
  const common = { width: 64, height: 64, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (kind === "check") return (<svg {...common}><circle cx="12" cy="12" r="10" /><path d="M7 12.5l3.2 3.2L17 9" /></svg>);
  if (kind === "cross") return (<svg {...common}><circle cx="12" cy="12" r="10" /><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" /></svg>);
  return (<svg {...common}><circle cx="12" cy="12" r="10" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8" /><path d="M12 17h.01" /></svg>);
}

export default function StatusBanner({ status, headline, routeLabel }: Props) {
  const s = STYLES[status];
  return (
    <section aria-label={s.aria} data-status={status} className={`${s.box} rounded-2xl p-6 shadow-md`}>
      <div className="flex items-center gap-4">
        <Icon kind={s.icon} />
        <div>
          <h2 className="text-3xl font-extrabold leading-tight sm:text-5xl">{s.label}</h2>
          {routeLabel ? <p className="mt-1 text-lg font-semibold">{routeLabel}</p> : null}
        </div>
      </div>
      {headline ? <p className="mt-4 text-xl leading-snug">{headline}</p> : null}
    </section>
  );
}
