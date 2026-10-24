/** Loading placeholder that matches the result layout to avoid layout shift. */
export default function StatusSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-busy="true">
      <span className="sr-only">Checking the latest MBTA information…</span>
      <div className="skeleton h-40 rounded-3xl sm:h-48" />
      <div className="flex gap-3">
        <div className="skeleton h-8 w-28 rounded-full" />
        <div className="skeleton h-8 w-40 rounded-full" />
      </div>
      <div className="skeleton h-32 rounded-2xl" />
      <div className="skeleton h-24 rounded-2xl" />
    </div>
  );
}
