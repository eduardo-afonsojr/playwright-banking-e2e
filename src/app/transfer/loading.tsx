/** Instant loading state for the transfer page: balances + form cards. */
export default function TransferLoading() {
  return (
    <main data-testid="page-loading" aria-busy="true">
      <div className="skeleton" style={{ height: 28, width: 220 }} />
      <div
        className="skeleton"
        style={{ height: 16, width: 300, margin: "0.6rem 0 1.75rem" }}
      />
      <div
        className="skeleton"
        style={{ height: 110, borderRadius: 12, marginBottom: "1.1rem" }}
      />
      <div className="skeleton" style={{ height: 320, borderRadius: 12 }} />
    </main>
  );
}
