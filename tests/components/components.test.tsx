// Server-render the presentational components and check the accessibility contract in the markup.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import StatusBanner from "@/components/StatusBanner";
import DataSourceBadge from "@/components/DataSourceBadge";
import AlertCard from "@/components/AlertCard";
import AlternativeCard from "@/components/AlternativeCard";
import TripForm from "@/components/TripForm";
import type { Alert, Station } from "@/lib/types";

const alert: Alert = {
  id: "1", effect: "ELEVATOR_CLOSURE", header: "Alewife Elevator 813 is unavailable.", description: "",
  stationIds: ["place-alfcl"], facilityIds: ["813"], activePeriod: [{ start: "2026-10-24T00:00:00Z", end: null }], severity: 3, updatedAt: "",
};
const station: Station = { id: "place-davis", name: "Davis", lines: ["Red"], wheelchairBoarding: "accessible", lat: 1, lng: 2 };

describe("StatusBanner: icon AND text for every state, never colour alone", () => {
  it.each([
    ["STEP_FREE", "Step-free", "bg-green-800"],
    ["NOT_STEP_FREE", "Not step-free", "bg-red-800"],
    ["UNKNOWN", "Cannot confirm", "bg-gray-700"],
  ] as const)("%s", (status, label, colour) => {
    const html = renderToStaticMarkup(<StatusBanner status={status} headline="Plain words." routeLabel="A to B" />);
    expect(html).toContain(label);
    expect(html).toContain(colour);
    expect(html).toContain("<svg");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("<h2");
    expect(html).toContain("aria-label=");
    expect(html).toContain('data-status="' + status + '"');
  });
});

describe("DataSourceBadge", () => {
  it.each([
    ["live", "Live"],
    ["snapshot", "Offline snapshot, not live"],
    ["demo", "Simulated demo data"],
  ] as const)("%s", (source, text) => {
    expect(renderToStaticMarkup(<DataSourceBadge source={source} />)).toContain(text);
  });
});

describe("AlertCard and AlternativeCard", () => {
  it("labels a blocking alert with a symbol and words, and shows the plain text first", () => {
    const html = renderToStaticMarkup(<AlertCard alert={alert} blocking explanation="An elevator is out." />);
    expect(html).toContain("Blocks your trip");
    expect(html).toContain("An elevator is out.");
    expect(html).toContain("Original MBTA notice");
  });

  it("falls back to the MBTA header when there is no explanation", () => {
    const html = renderToStaticMarkup(<AlertCard alert={alert} blocking={false} />);
    expect(html).toContain("Alewife Elevator 813 is unavailable.");
    expect(html).toContain("Good to know");
  });

  it("names the alternative and the station it replaces", () => {
    const html = renderToStaticMarkup(<AlternativeCard station={station} instead="Alewife" />);
    expect(html).toContain("Davis");
    expect(html).toContain("instead of Alewife");
    expect(html).toContain("aria-labelledby");
  });
});

describe("TripForm", () => {
  it("has visible labels, a radio group with a legend, and a 56px submit button", () => {
    const html = renderToStaticMarkup(<TripForm stations={[station]} onSave={() => undefined} />);
    expect(html).toContain("Start station");
    expect(html).toContain("End station");
    expect(html).toContain("<legend");
    expect(html.match(/type="radio"/g)).toHaveLength(3);
    expect(html).toContain("Save trip");
    expect(html).toContain("min-h-[56px]");
    expect(html).toContain('aria-live="polite"');
  });
});
