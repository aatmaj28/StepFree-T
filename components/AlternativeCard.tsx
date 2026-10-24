import type { Station } from "@/lib/types";

interface Props {
  station: Station;
  instead?: string | undefined;
}

export default function AlternativeCard({ station, instead }: Props) {
  return (
    <section aria-labelledby="alt-heading" className="rounded-xl border-2 border-green-800 bg-white p-4">
      <h3 id="alt-heading" className="text-xl font-bold text-green-900">
        <span aria-hidden="true">✔ </span>
        Try this station instead
      </h3>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{station.name}</p>
      <p className="mt-1 text-base text-slate-800">
        {instead ? `Use ${station.name} instead of ${instead}. ` : ""}
        It is on the {station.lines.join(" and ")} Line. The MBTA lists it as accessible, and we found no problems there just now.
      </p>
    </section>
  );
}
