import type { DataSource } from "@/lib/types";

interface Props {
  source: DataSource;
  fetchedAt?: string;
}

const COPY: Record<DataSource, { text: string; cls: string }> = {
  live: { text: "Live", cls: "bg-green-100 text-green-900 border-green-800" },
  snapshot: { text: "Offline snapshot, not live", cls: "bg-amber-100 text-amber-900 border-amber-800" },
  demo: { text: "Simulated demo data", cls: "bg-violet-100 text-violet-900 border-violet-800" },
};

export default function DataSourceBadge({ source, fetchedAt }: Props) {
  const c = COPY[source];
  return (
    <p
      className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-base font-semibold ${c.cls}`}
      data-source={source}
      aria-label={`Data source: ${c.text}${fetchedAt ? `, from ${fetchedAt}` : ""}`}
    >
      <span aria-hidden="true">{source === "live" ? "●" : source === "demo" ? "◆" : "▲"}</span>
      {c.text}
    </p>
  );
}
