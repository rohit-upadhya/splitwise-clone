"use client";

import { useState } from "react";
import { useRates } from "@/lib/useRates";
import { convertAmount } from "@/lib/balances";
import { CURRENCIES, Currency } from "@/lib/types";

export function CurrencyTicker() {
  const { rates, loading, error } = useRates();
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState<Currency>("EUR");

  const numeric = parseFloat(amount) || 0;

  return (
    <div className="w-full border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="font-medium text-neutral-500">Live rates (base 1 USD)</span>
          {loading && <span className="text-neutral-400">loading…</span>}
          {!loading &&
            rates &&
            CURRENCIES.map((c) => (
              <span key={c.code} className="tabular-nums text-neutral-700 dark:text-neutral-300">
                {c.flag} {c.code} {rates.rates[c.code]?.toFixed(3)}
              </span>
            ))}
          {error && <span className="text-amber-600">using fallback rates</span>}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-20 rounded-md border border-neutral-300 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
          />
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value as Currency)}
            className="rounded-md border border-neutral-300 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
          <span className="text-neutral-400">=</span>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {rates &&
              CURRENCIES.filter((c) => c.code !== from).map((c) => (
                <span key={c.code} className="tabular-nums">
                  {c.symbol}
                  {convertAmount(numeric, from, c.code, rates.rates).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{" "}
                  <span className="text-neutral-400">{c.code}</span>
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
