import { z } from "zod";
import type { TripResult, UserProfile } from "@/lib/types";
import { ExplanationItemSchema, type ExplainResponse } from "@/lib/api/schemas";
import { fallbackExplanation } from "./fallback-templates";

export const AI_TIMEOUT_MS = 8000;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = [
  "You rewrite MBTA subway alerts for riders who need step-free travel.",
  "Rewrite each alert at a grade 6 reading level, in short sentences with everyday words.",
  "For each alert say: what is broken, what it means for this rider profile, and what to do next.",
  "Never invent facts that are not in the alert or the trip data. No phone numbers, times, or station names that are not in the input.",
  "Never claim a station is accessible or step-free unless the input status says STEP_FREE.",
  'Reply with JSON only, no markdown: {"summary": string, "explanations": [{"alertId": string, "text": string}]}.',
  "Include exactly one explanation for every alert id given, and also a short summary of the whole trip result.",
].join(" ");

const ModelOutputSchema = z.object({
  summary: z.string().min(1).max(1200),
  explanations: z.array(ExplanationItemSchema),
});

export function buildModelInput(result: TripResult, profile: UserProfile): string {
  const alerts = [...result.blockingAlerts, ...result.infoAlerts].map((a) => ({
    alertId: a.id,
    effect: a.effect,
    blocking: result.blockingAlerts.some((b) => b.id === a.id),
    header: a.header,
    description: a.description.slice(0, 700),
  }));
  return JSON.stringify({
    profile,
    status: result.status,
    isStale: result.isStale,
    dataSource: result.dataSource,
    reasons: result.reasons.map((r) => r.message),
    alternativeStation: result.alternative?.name ?? null,
    alerts,
  });
}

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("no JSON object in model output");
  return JSON.parse(cleaned.slice(start, end + 1));
}

// A model that says "is accessible" about a trip we did not verify has broken the safety contract.
const POSITIVE_CLAIM = /\b(is|are|remains?|looks?)\s+(now\s+|fully\s+)?(step-free|wheelchair accessible|accessible)\b/i;

/** Returns validated output or throws. Callers fall back to templates on any throw. */
export function validateModelOutput(raw: unknown, result: TripResult): ExplainResponse {
  const parsed = ModelOutputSchema.parse(raw);
  const expected = [...result.blockingAlerts, ...result.infoAlerts].map((a) => a.id);
  const byId = new Map(parsed.explanations.map((e) => [e.alertId, e.text] as const));
  const explanations = expected.map((id) => {
    const text = byId.get(id);
    if (!text) throw new Error(`model skipped alert ${id}`);
    return { alertId: id, text };
  });
  if (result.status !== "STEP_FREE") {
    const texts = [parsed.summary, ...explanations.map((e) => e.text)];
    if (texts.some((t) => POSITIVE_CLAIM.test(t))) throw new Error("model claimed accessibility without verified data");
  }
  return { explanations, summary: parsed.summary, usedAI: true };
}

export interface ExplainDeps {
  apiKey?: string | undefined;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  model?: string | undefined;
}

async function callAnthropic(result: TripResult, profile: UserProfile, deps: ExplainDeps, apiKey: string): Promise<ExplainResponse> {
  const doFetch = deps.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? AI_TIMEOUT_MS);
  try {
    const res = await doFetch(ANTHROPIC_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: deps.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildModelInput(result, profile) }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic responded ${res.status}`);
    const body: unknown = await res.json();
    const text = z
      .object({ content: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()) })
      .parse(body)
      .content.map((c) => c.text ?? "")
      .join("");
    return validateModelOutput(extractJson(text), result);
  } finally {
    clearTimeout(timer);
  }
}

/** Never throws. AI when a key is set and the output validates; templates otherwise. */
export async function explainTrip(result: TripResult, profile: UserProfile, deps: ExplainDeps = {}): Promise<ExplainResponse> {
  const apiKey = deps.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackExplanation(result, profile);
  try {
    return await callAnthropic(result, profile, deps, apiKey);
  } catch {
    return fallbackExplanation(result, profile);
  }
}
