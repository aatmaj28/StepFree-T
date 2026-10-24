# 03 App, UI and deploy: design

```
app/layout.tsx          skip link, header, <main>, footer with DemoSwitch
app/page.tsx            client page: saved trip -> useStatus -> Result
app/trip/new/page.tsx   client page: /api/stations -> TripForm -> localStorage
components/             StatusBanner, TripForm, AlertCard, AlternativeCard, DataSourceBadge, DemoSwitch
lib/client/             storage.ts (Zod-checked localStorage), demo-store.ts (useSyncExternalStore),
                        use-status.ts (status then explain, with abort), types.ts
```

## Flow

`useStatus(trip, demo)` fetches `/api/status` (or `/api/demo?scenario=` in demo mode), then POSTs the result to `/api/explain`. If explain fails the status still shows, using the raw MBTA header text. Any status failure shows a gray UNKNOWN banner with the error and a retry.

## Decisions

- Pages are client components because the saved trip is in `localStorage`. All data and decisions come from the API routes; the UI never decides a status itself.
- Demo mode is stored in `localStorage` and shared between footer and page through `useSyncExternalStore`.
- Colour pairs: white on green-800 / red-800 / gray-700 / blue-800 (all above 4.5:1). Every state also has an icon and a word.
- Tailwind 3 with `min-h-[44px]` on controls and a global `:focus-visible` ring.
- Text is `rem`-based with responsive classes so 200% zoom reflows without horizontal scroll.
- TypeScript 5.x is pinned: Next 15 cannot read `tsconfig` paths with the TypeScript 7 native compiler.
- Vercel: no database, no required env vars. `outputFileTracingIncludes` ships the offline snapshot with the API functions.
