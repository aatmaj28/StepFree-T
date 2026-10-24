---
inclusion: fileMatch
fileMatchPattern: "{app,components}/**/*.{ts,tsx,css}"
---

# Accessibility rules for the UI

The hook `a11y-check-on-component` checks every saved file in `components/` against this list.

1. **Contrast: WCAG AA.** Text 4.5:1, large text and UI parts 3:1. Approved pairs: white on `green-800`, `red-800`, `gray-700`, `blue-800`; `slate-900` on white.
2. **Never colour alone.** Every status shows an icon AND text ("Step-free", "Not step-free", "Cannot confirm"). Alert cards and the data badge also carry a symbol and words.
3. **Status region:** the element that shows the result is inside `aria-live="polite"`. Loading uses `role="status"` with `aria-busy="true"`. Errors use `role="alert"`.
4. **Labels:** every input has a visible `<label>`. Icon-only things have `aria-label`. Decorative icons have `aria-hidden="true"`. Selects and radios sit inside a `<fieldset>` with a `<legend>` when grouped.
5. **Focus:** every interactive element shows a visible focus ring (3px outline in `globals.css`). Never `outline: none` without a replacement.
6. **Tap targets:** at least 44 by 44 CSS pixels (`min-h-[44px]`). Check links, buttons, selects, summaries, switches.
7. **Semantics:** one `<h1>` per page, headings in order (`h1` then `h2` then `h3`), lists as `<ul>/<li>`, a skip link, `<main>`, `<header>`, `<footer>`.
8. **Zoom and reflow:** works at 200% zoom with no horizontal scroll. Use `rem` and responsive Tailwind classes. No fixed pixel widths on text containers.
9. **Motion:** none required. Respect `prefers-reduced-motion`.
10. **Every fetch has loading, empty and error states**, and the error state offers a retry.
11. **Honest labels:** show the data source badge ("Live", "Offline snapshot, not live", "Simulated demo") and the last-checked time.
