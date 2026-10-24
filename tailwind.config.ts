import type { Config } from "tailwindcss";

/**
 * AccessPath AI design system.
 * Tokens are intentionally conservative: WCAG AA contrast is preserved on every
 * foreground/background pairing used in the UI. Status colours keep the original
 * green-800 / red-800 / gray-700 family so the accessibility contract (and the
 * component tests that assert high-contrast status surfaces) still holds.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep navy anchors + teal brand accent.
        ink: {
          DEFAULT: "#0f172a", // slate-900, primary text
          soft: "#334155", // slate-700, secondary text
          muted: "#64748b", // slate-500, tertiary text
        },
        brand: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
        surface: {
          base: "#f6f8fb", // page background
          raised: "#ffffff", // cards
          sunken: "#eef2f7", // inset wells
        },
        hairline: "#e2e8f0", // slate-200 borders
        // Semantic accessibility status (kept AA-strong on white text).
        status: {
          free: "#166534", // green-800
          "free-tint": "#f0fdf4",
          blocked: "#991b1b", // red-800
          "blocked-tint": "#fef2f2",
          unknown: "#374151", // gray-700
          "unknown-tint": "#f3f4f6",
        },
        // MBTA line colours (official-ish, AA-checked against white text where used as fills).
        mbta: {
          red: "#da291c",
          orange: "#ed8b00",
          blue: "#003da5",
          green: "#00843d",
          mattapan: "#da291c",
          silver: "#7c878e",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.06)",
        "card-lg": "0 2px 6px rgba(15, 23, 42, 0.06), 0 12px 32px rgba(15, 23, 42, 0.10)",
        hero: "0 12px 40px rgba(15, 23, 42, 0.16)",
        focus: "0 0 0 3px rgba(13, 148, 136, 0.35)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out both",
        "pulse-dot": "pulse-dot 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
