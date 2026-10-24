# 03 App, UI and deploy: requirements (EARS)

Owner: Aatmaj. Scope: mobile-first pages, components, accessibility, Vercel deploy.

1. WHEN a trip is saved in `localStorage`, THE home page SHALL call `/api/status` and show a status banner, the plain-language summary, blocking alerts, other notices, the alternative card, a data-source badge, the last-checked time and a Refresh button.
2. THE status banner SHALL show green with a check and "Step-free" for `STEP_FREE`, red with a cross and "Not step-free" for `NOT_STEP_FREE`, and gray with a question mark and "Cannot confirm" for `UNKNOWN`; colour SHALL never be the only signal.
3. THE data-source badge SHALL read "Live", "Offline snapshot, not live" or "Simulated demo data".
4. WHEN no trip is saved and demo mode is off, THE home page SHALL show an empty state that links to `/trip/new`.
5. THE `/trip/new` page SHALL populate origin and destination selects from `/api/stations`, let the rider filter them by typing, offer a profile radio group, and WHEN the rider saves a valid form, SHALL write `localStorage` and return home.
6. IF origin and destination are missing or equal, THEN THE form SHALL show an error message and SHALL NOT save.
7. WHILE any fetch is in progress, THE page SHALL show a loading state; IF a fetch fails, THEN THE page SHALL show an error state with a retry control and an UNKNOWN banner, never a green one.
8. THE footer SHALL hold a "Demo mode" switch that calls `/api/demo` scenarios, and WHILE demo mode is on THE UI SHALL label the result "Simulated demo data".
9. THE status region SHALL use `aria-live="polite"`.
10. THE UI SHALL meet WCAG AA contrast, show visible focus rings, make every tap target at least 44 px, use semantic headings, and work at 200% zoom.
11. THE project SHALL build with `next build`, read the optional env vars `MBTA_API_KEY`, `ANTHROPIC_API_KEY`, and deploy to Vercel with no required configuration.
