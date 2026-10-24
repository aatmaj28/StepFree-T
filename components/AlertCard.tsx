import type { Alert } from "@/lib/types";

interface Props {
  alert: Alert;
  explanation?: string | undefined;
  blocking: boolean;
  /** How many MBTA notices share this exact explanation (they are shown as one card). */
  count?: number;
}

export default function AlertCard({ alert, explanation, blocking, count = 1 }: Props) {
  const border = blocking ? "border-red-800" : "border-slate-500";
  return (
    <li className={`rounded-xl border-l-8 ${border} bg-white p-4 shadow-sm`}>
      <p className="text-sm font-bold uppercase tracking-wide text-slate-700">
        <span aria-hidden="true">{blocking ? "⛔ " : "ℹ️ "}</span>
        {blocking ? "Blocks your trip" : "Good to know"}
        {count > 1 ? `: ${count} notices like this` : ""}
      </p>
      <p className="mt-1 text-lg text-slate-900">{explanation ?? alert.header}</p>
      {explanation && alert.header ? (
        <details className="mt-2">
          <summary className="inline-flex cursor-pointer items-center text-base font-semibold text-blue-800 underline">
            Original MBTA notice
          </summary>
          <p className="mt-2 text-base text-slate-800">{alert.header}</p>
        </details>
      ) : null}
    </li>
  );
}
