// Placeholder while a lazy route chunk downloads: a quiet page-shaped
// skeleton rather than a spinner. No fixed height that could cause a visible
// jump when the route mounts.
export default function RouteLoadingFallback() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="ot-container min-h-[60vh] pt-[calc(var(--nav-h)+3rem)]"
    >
      <div className="max-w-2xl animate-pulse space-y-4" aria-hidden="true">
        <div className="h-3 w-24 rounded-full bg-sunken" />
        <div className="h-9 w-3/4 rounded-lg bg-sunken" />
        <div className="h-4 w-full rounded bg-sunken" />
        <div className="h-4 w-5/6 rounded bg-sunken" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
