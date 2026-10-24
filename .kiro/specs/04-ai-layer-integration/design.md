# 04 AI layer and integration: design

```
POST /api/explain
  Zod(ExplainRequestSchema) --400--> {error, details}
  explainTrip(tripResult, profile)               never throws
    no key ------------------------------------> fallbackExplanation (usedAI:false)
    key  -> POST api.anthropic.com/v1/messages   (8 s AbortController)
              -> extract JSON -> Zod(ModelOutputSchema)
              -> every alert id answered?  no -> fallback
              -> status != STEP_FREE and text says "is accessible/step-free"?  yes -> fallback
              -> usedAI:true
```

## Files

- `lib/api/schemas.ts`: Zod schemas for query strings, `TripResult` and the explain request/response.
- `lib/api/http.ts`: `parseQuery` (400 with flattened Zod issues), `loadSnapshot` (502 on total failure), `sourceMeta`.
- `lib/ai/explain.ts`: prompt, Anthropic call, validation, fallback. Model from `ANTHROPIC_MODEL`, default `claude-haiku-4-5`.
- `lib/ai/fallback-templates.ts`: per-alert and per-status templates in grade 6 language that end with an action.
- `lib/data/demo-snapshot.ts`: simulated snapshot, imported only by `app/api/demo/route.ts`.

## Decisions

- The model only rewrites; it never decides the status. The status comes from the engine and is sent as an input fact.
- The model gets only facts from the `TripResult`. Any validation failure falls back, so a bad model answer can never reach the rider.
- The demo trip is Alewife to Park Street for a wheelchair rider. The outage scenario breaks both platform elevators (813, 961), which the real platform map marks as verified, so the real engine produces NOT_STEP_FREE and a real alternative (Davis).
- The `api-down` scenario is a 3-hour-old simulated snapshot, so the real freshness rule produces UNKNOWN.
- Per-alert templates cannot tell which reason belongs to which alert (Reason has no alert id), so non-blocking elevator text states only what is true for every non-blocking outcome.
