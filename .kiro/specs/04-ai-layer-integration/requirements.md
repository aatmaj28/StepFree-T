# 04 AI layer and integration: requirements (EARS)

Owner: Pradyannya. Scope: the API routes, `/api/explain`, templates, and wiring to the UI.

1. EVERY API route SHALL validate its input with Zod, return JSON, return 400 `{error, details}` for bad input, include `dataSource` and `fetchedAt` where data is involved, and export `dynamic = "force-dynamic"`.
2. IF MBTA fails, THEN THE routes SHALL fall back to the committed snapshot; IF the snapshot also fails, THEN THE routes SHALL return 502 with `status: "UNKNOWN"` and SHALL NOT crash.
3. THE routes `/api/health`, `/api/stations`, `/api/alerts?stationId=`, `/api/facilities?stationId=`, `/api/status`, `/api/alternatives` SHALL return the shapes in the task brief, and `/api/stations` SHALL be sorted by name.
4. WHEN `POST /api/explain` receives `{tripResult, profile}`, THE route SHALL return `{explanations: [{alertId, text}], summary, usedAI}`.
5. WHERE `ANTHROPIC_API_KEY` is set, THE route SHALL call the Anthropic Messages API from the server with a prompt that requires grade 6 language, what is broken, what it means for the profile and what to do next, no invented facts, and no claim of accessibility unless the status says `STEP_FREE`.
6. THE route SHALL validate the model output with Zod, SHALL require one explanation per alert, and SHALL reject output that claims accessibility when the status is not `STEP_FREE`.
7. IF the key is missing, the call fails, the call takes longer than 8 seconds, or validation fails, THEN THE route SHALL return the deterministic templates from `fallback-templates.ts` with `usedAI: false`, and SHALL NOT throw to the client.
8. WHEN `GET /api/demo?scenario=` is called with `elevator-outage-alewife`, `all-clear` or `api-down`, THE route SHALL evaluate Alewife to Park Street on a simulated snapshot with `source: "demo"` and SHALL label the response "Simulated demo data".
9. THE real routes SHALL NEVER import or return demo data.
10. THE app SHALL work with no environment variables set.
