"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { computeNetBalancesInCurrency, simplifyDebts } from "@/lib/balances";
import { CURRENCIES, Currency, Group } from "@/lib/types";
import { useRates } from "@/lib/useRates";
import { AddExpenseModal } from "./AddExpenseModal";
import { SettleUpModal } from "./SettleUpModal";

function fmt(amount: number, currency: Currency) {
  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? "";
  return `${symbol}${Math.abs(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function GroupView({ group }: { group: Group }) {
  const members = useStore((s) => s.members);
  // Select the raw arrays (stable refs) and filter in useMemo — returning a new
  // array straight from the selector triggers an infinite loop under zustand v5.
  const allExpenses = useStore((s) => s.expenses);
  const allSettlements = useStore((s) => s.settlements);
  const expenses = useMemo(
    () => allExpenses.filter((e) => e.groupId === group.id),
    [allExpenses, group.id]
  );
  const settlements = useMemo(
    () => allSettlements.filter((s) => s.groupId === group.id),
    [allSettlements, group.id]
  );
  const displayCurrency = useStore((s) => s.displayCurrency);
  const setDisplayCurrency = useStore((s) => s.setDisplayCurrency);
  const deleteExpense = useStore((s) => s.deleteExpense);
  const { rates } = useRates();

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [settleDefaults, setSettleDefaults] = useState<{ from?: string; to?: string; amount?: number } | null>(
    null
  );

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "Unknown";

  const netBalances = useMemo(() => {
    if (!rates) return null;
    return computeNetBalancesInCurrency(group, expenses, settlements, displayCurrency, rates.rates);
  }, [group, expenses, settlements, displayCurrency, rates]);

  const suggestions = useMemo(() => (netBalances ? simplifyDebts(netBalances) : []), [netBalances]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{group.name}</h2>
          <p className="text-sm text-neutral-500">
            {group.memberIds.map(nameOf).join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value as Currency)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            title="Balances shown in this currency"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                Show in {c.code}
              </option>
            ))}
          </select>
          <button
            onClick={() => setSettleDefaults({})}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Settle up
          </button>
          <button
            onClick={() => setShowAddExpense(true)}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Add expense
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <h3 className="mb-3 font-medium">Balances</h3>
          {!netBalances && <p className="text-sm text-neutral-400">Loading rates…</p>}
          {netBalances && (
            <ul className="space-y-2 text-sm">
              {group.memberIds.map((id) => {
                const amount = netBalances[id] ?? 0;
                return (
                  <li key={id} className="flex items-center justify-between">
                    <span>{nameOf(id)}</span>
                    <span
                      className={
                        amount > 0.01
                          ? "font-medium text-emerald-600"
                          : amount < -0.01
                          ? "font-medium text-rose-600"
                          : "text-neutral-400"
                      }
                    >
                      {amount > 0.01 && `gets back ${fmt(amount, displayCurrency)}`}
                      {amount < -0.01 && `owes ${fmt(amount, displayCurrency)}`}
                      {Math.abs(amount) <= 0.01 && "settled up"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <h3 className="mb-3 font-medium">Suggested settlements</h3>
          {suggestions.length === 0 && <p className="text-sm text-neutral-400">Everyone is squared up 🎉</p>}
          <ul className="space-y-2 text-sm">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span>
                  {nameOf(s.from)} → {nameOf(s.to)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{fmt(s.amount, displayCurrency)}</span>
                  <button
                    onClick={() => setSettleDefaults({ from: s.from, to: s.to, amount: s.amount })}
                    className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                  >
                    Settle
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h3 className="mb-3 font-medium">Activity</h3>
        {expenses.length === 0 && settlements.length === 0 && (
          <p className="text-sm text-neutral-400">No expenses yet. Add the first one!</p>
        )}
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {[
            ...expenses.map((e) => ({ type: "expense" as const, date: e.date, e })),
            ...settlements.map((s) => ({ type: "settlement" as const, date: s.date, s })),
          ]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((item, i) =>
              item.type === "expense" ? (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">{item.e.description}</p>
                    <p className="text-xs text-neutral-500">
                      {nameOf(item.e.paidBy)} paid {fmt(item.e.amount, item.e.currency)} ·{" "}
                      {new Date(item.e.date).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteExpense(item.e.id)}
                    className="text-xs text-neutral-400 hover:text-rose-600"
                  >
                    delete
                  </button>
                </li>
              ) : (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">
                      {nameOf(item.s.from)} paid {nameOf(item.s.to)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {fmt(item.s.amount, item.s.currency)} · {new Date(item.s.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs text-emerald-600">settled</span>
                </li>
              )
            )}
        </ul>
      </div>

      {showAddExpense && <AddExpenseModal group={group} onClose={() => setShowAddExpense(false)} />}
      {settleDefaults && (
        <SettleUpModal
          group={group}
          defaultFrom={settleDefaults.from}
          defaultTo={settleDefaults.to}
          defaultAmount={settleDefaults.amount}
          onClose={() => setSettleDefaults(null)}
        />
      )}
    </div>
  );
}
