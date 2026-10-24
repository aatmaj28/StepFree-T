/**
 * AccessPath AI brand mark: a step-free "path" motif — a route node that opens into a
 * level ramp, rendered in the teal brand gradient. Decorative; the product name carries the label.
 */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 shadow-sm ${className}`}
      aria-hidden="true"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" role="presentation">
        {/* origin node */}
        <circle cx="5.5" cy="6" r="2.4" fill="white" />
        {/* level, step-free path down to the destination */}
        <path
          d="M5.5 9v4.5a3 3 0 0 0 3 3H18"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* destination arrow */}
        <path
          d="M15.5 13.5 18.5 16.5 15.5 19.5"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
