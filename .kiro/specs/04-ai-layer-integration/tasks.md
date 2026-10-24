# 04 AI layer and integration: tasks

- [x] Zod schemas for every route input and for `TripResult`
- [x] `loadSnapshot` / `parseQuery` helpers (400 and 502 handling)
- [x] `/api/health`, `/api/stations`, `/api/alerts`, `/api/facilities`
- [x] `/api/status` and `/api/alternatives`
- [x] `/api/demo` with three simulated scenarios, labelled "Simulated demo data"
- [x] `fallback-templates.ts`
- [x] `explain.ts` with Anthropic call, 8 s timeout, Zod validation, accessibility-claim guard, fallback
- [x] `/api/explain` route
- [x] Route tests against the real committed snapshot (`FORCE_OFFLINE=1`): shapes, 400s, 404s, 502, demo scenarios
- [x] Explain tests with a stubbed Anthropic: success, HTTP error, non-JSON, missing alert, false claim, timeout, network error
- [x] Verified with a running dev server: every endpoint, bad-input 400s, explain without a key, explain with a dummy key falls back
- [ ] Verify the AI path against the real Anthropic API with a real `ANTHROPIC_API_KEY` (not done: no key available here; only the stubbed path is tested)
- [ ] Add per-alert ids to `Reason` so templates can be exact about each elevator
- [ ] Rate-limit `/api/explain` before a public deploy (it can spend the owner's Anthropic credits)
