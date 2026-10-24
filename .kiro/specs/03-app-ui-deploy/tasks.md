# 03 App, UI and deploy: tasks

- [x] Tailwind, PostCSS, `globals.css` with focus ring, 44 px targets, reduced motion
- [x] `layout.tsx` with skip link, landmarks, footer
- [x] `StatusBanner`, `DataSourceBadge`, `AlertCard`, `AlternativeCard`
- [x] `TripForm` with searchable selects, radio group, validation
- [x] Home page: empty, loading, error and result states; Refresh; last-checked time
- [x] `/trip/new` page with loading, error + retry, and save
- [x] Demo mode switch in the footer with three scenarios
- [x] `next build` passes; `tsc --noEmit` clean
- [x] Home page, `/trip/new` return 200 from the dev server
- [ ] Run an automated accessibility audit (axe/Lighthouse) in a real browser and fix findings
- [ ] Manually test at 200% zoom and with a screen reader (VoiceOver / NVDA)
- [ ] Test on a real phone
- [ ] `vercel deploy` and record the public URL (not done: needs the owner's Vercel account)
