"use client";
import { setDemoScenario, useDemoScenario } from "@/lib/client/demo-store";
import { DEMO_LABELS, type DemoScenarioId } from "@/lib/client/types";

const IDS = Object.keys(DEMO_LABELS) as DemoScenarioId[];

export default function DemoSwitch() {
  const scenario = useDemoScenario();
  const on = scenario !== null;
  return (
    <div className="space-y-3">
      <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-lg font-semibold">
        <input
          type="checkbox"
          role="switch"
          aria-checked={on}
          checked={on}
          onChange={(e) => setDemoScenario(e.target.checked ? "elevator-outage-alewife" : null)}
          className="h-6 w-6"
        />
        Demo mode (simulated data)
      </label>
      {on ? (
        <div>
          <label htmlFor="demo-scenario" className="block text-base font-semibold">
            Demo scenario: Alewife to Park Street
          </label>
          <select
            id="demo-scenario"
            value={scenario}
            onChange={(e) => setDemoScenario(e.target.value as DemoScenarioId)}
            className="mt-1 w-full rounded-lg border-2 border-slate-600 bg-white px-3 text-lg"
          >
            {IDS.map((id) => (
              <option key={id} value={id}>
                {DEMO_LABELS[id]}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
