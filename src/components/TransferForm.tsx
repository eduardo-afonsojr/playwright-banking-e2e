"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AccountDto } from "@/lib/serialize";

export function TransferForm({ accounts }: { accounts: AccountDto[] }) {
  const router = useRouter();
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          amount: Number(amount),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? "Transfer failed. Please try again.");
        return;
      }

      setSuccess("Transfer completed successfully.");
      setAmount("");
      // Refresh server-rendered balances elsewhere in the app.
      router.refresh();
    } catch {
      // Network-level failure: the request never got a response.
      setError("Transfer failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} data-testid="transfer-form">
      {error && (
        <div className="alert alert-error" data-testid="transfer-error">
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" data-testid="transfer-success">
          {success}
        </div>
      )}
      <div className="transfer-row">
        <div className="form-field">
          <label htmlFor="from-account">From</label>
          <select
            id="from-account"
            data-testid="transfer-from"
            value={fromAccountId}
            onChange={(event) => setFromAccountId(event.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <span className="transfer-arrow" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </span>
        <div className="form-field">
          <label htmlFor="to-account">To</label>
          <select
            id="to-account"
            data-testid="transfer-to"
            value={toAccountId}
            onChange={(event) => setToAccountId(event.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="amount">Amount (USD)</label>
        <input
          id="amount"
          data-testid="transfer-amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
        {/* Quick amounts derive from the selected source account's balance,
            so the user never has to look it up or type it by hand. */}
        <div className="quick-amounts">
          {([25, 50, 100] as const).map((percent) => {
            const balance =
              accounts.find((account) => account.id === fromAccountId)
                ?.balance ?? 0;
            const value = (
              Math.round(balance * percent) / 100
            ).toFixed(2);
            return (
              <button
                key={percent}
                type="button"
                data-testid={`transfer-quick-${percent}`}
                onClick={() => {
                  setAmount(value);
                  setError(null);
                  setSuccess(null);
                }}
              >
                {percent === 100 ? "Max" : `${percent}%`}
              </button>
            );
          })}
        </div>
      </div>
      <button type="submit" data-testid="transfer-submit" disabled={submitting}>
        {submitting ? "Transferring…" : "Transfer"}
      </button>
    </form>
  );
}
