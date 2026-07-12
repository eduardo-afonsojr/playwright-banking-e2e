/** Instant loading state for the history page: filter bar + table rows. */
export default function HistoryLoading() {
  return (
    <main data-testid="page-loading" aria-busy="true">
      <div className="skeleton" style={{ height: 28, width: 260 }} />
      <div
        className="skeleton"
        style={{ height: 16, width: 340, margin: "0.6rem 0 1.75rem" }}
      />
      <div
        className="skeleton"
        style={{ height: 88, borderRadius: 12, marginBottom: "1.25rem" }}
      />
      <div className="table-card" style={{ padding: "0.5rem 1.1rem" }}>
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="skeleton"
            style={{ height: 34, margin: "0.55rem 0" }}
          />
        ))}
      </div>
    </main>
  );
}
