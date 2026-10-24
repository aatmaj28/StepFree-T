// Presentation-only helpers that map MBTA line names to brand colours and classes.
// No business logic: purely for the UI. Station.lines values come from the data layer
// ("Red", "Orange", "Blue", "Green", "Mattapan").

export interface LineStyle {
  /** Tailwind background class for a solid line chip/segment. */
  bg: string;
  /** Tailwind text colour that reads AA on the bg above (white for all current lines). */
  text: string;
  /** Hex, for inline SVG strokes/fills in the route schematic. */
  hex: string;
  label: string;
}

const LINES: Record<string, LineStyle> = {
  red: { bg: "bg-mbta-red", text: "text-white", hex: "#da291c", label: "Red Line" },
  orange: { bg: "bg-mbta-orange", text: "text-white", hex: "#ed8b00", label: "Orange Line" },
  blue: { bg: "bg-mbta-blue", text: "text-white", hex: "#003da5", label: "Blue Line" },
  green: { bg: "bg-mbta-green", text: "text-white", hex: "#00843d", label: "Green Line" },
  mattapan: { bg: "bg-mbta-mattapan", text: "text-white", hex: "#da291c", label: "Mattapan Line" },
};

const FALLBACK: LineStyle = { bg: "bg-ink-soft", text: "text-white", hex: "#334155", label: "Line" };

export function lineStyle(line: string): LineStyle {
  return LINES[line.trim().toLowerCase()] ?? { ...FALLBACK, label: `${line} Line` };
}

/** The line shared by two stations, if any, else the first line of the origin. */
export function commonLine(a: string[] | undefined, b: string[] | undefined): string | null {
  if (!a?.length) return null;
  const shared = a.find((l) => b?.includes(l));
  return shared ?? a[0] ?? null;
}
