/**
 * Instant loading state for the dashboard, streamed by the App Router while
 * the server component fetches from MongoDB. Mirrors the page's layout so
 * the transition doesn't jump.
 */
export default function DashboardLoading() {
  return (
    <main data-testid="page-loading" aria-busy="true">
      <div className="skeleton" style={{ height: 28, width: 220 }} />
      <div
        className="skeleton"
        style={{ height: 16, width: 320, margin: "0.6rem 0 1.75rem" }}
      />
      <div
        className="skeleton"
        style={{ height: 140, borderRadius: 16, marginBottom: "1.5rem" }}
      />
      <div className="account-list">
        <div className="skeleton" style={{ height: 150, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 150, borderRadius: 12 }} />
      </div>
    </main>
  );
}
