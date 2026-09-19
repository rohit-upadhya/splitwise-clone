"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { useStore } from "@/lib/store";
import { CURRENCIES, Currency, Group } from "@/lib/types";

export function SettleUpModal({
  group,
  defaultFrom,
  defaultTo,
  defaultAmount,
  onClose,
}: {
  group: Group;
  defaultFrom?: string;
  defaultTo?: string;
  defaultAmount?: number;
  onClose: () => void;
}) {
  const members = useStore((s) => s.members);
  const recordSettlement = useStore((s) => s.recordSettlement);
  const groupMembers = members.filter((m) => group.memberIds.includes(m.id));

  const [from, setFrom] = useState(defaultFrom ?? groupMembers[0]?.id ?? "");
  const [to, setTo] = useState(defaultTo ?? groupMembers[1]?.id ?? "");
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const [currency, setCurrency] = useState<Currency>("USD");

  const numericAmount = parseFloat(amount) || 0;
  const canSubmit = from && to && from !== to && numericAmount > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    recordSettlement({ groupId: group.id, from, to, amount: numericAmount, currency });
    onClose();
  };

  return (
    <Modal title="Settle up" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">From</label>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            >
              {groupMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <span className="mt-5 text-neutral-400">→</span>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">To</label>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            >
              {groupMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-md bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Record payment
        </button>
      </div>
    </Modal>
  );
}
