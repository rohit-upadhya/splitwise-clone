"use client";

import { useMemo, useState } from "react";
import { Modal } from "./Modal";
import { useStore } from "@/lib/store";
import { CURRENCIES, Currency, Expense, Group, SplitType } from "@/lib/types";

export function AddExpenseModal({
  group,
  expense,
  onClose,
}: {
  group: Group;
  expense?: Expense;
  onClose: () => void;
}) {
  const members = useStore((s) => s.members);
  const addExpense = useStore((s) => s.addExpense);
  const updateExpense = useStore((s) => s.updateExpense);
  const isEditing = !!expense;
  const groupMembers = useMemo(
    () => members.filter((m) => group.memberIds.includes(m.id)),
    [members, group.memberIds]
  );

  const editParticipantIds = expense ? Object.keys(expense.shares) : null;

  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [currency, setCurrency] = useState<Currency>(expense?.currency ?? "USD");
  const [paidBy, setPaidBy] = useState(expense?.paidBy ?? groupMembers[0]?.id ?? "");
  const [splitType, setSplitType] = useState<SplitType>(expense?.splitType ?? "equal");
  const [participants, setParticipants] = useState<Set<string>>(
    new Set(editParticipantIds ?? group.memberIds)
  );
  const [exact, setExact] = useState<Record<string, string>>(() =>
    expense?.splitType === "exact"
      ? Object.fromEntries(Object.entries(expense.shares).map(([id, v]) => [id, String(v)]))
      : {}
  );
  const [percent, setPercent] = useState<Record<string, string>>(() =>
    expense?.splitType === "percent" && expense.amount
      ? Object.fromEntries(
          Object.entries(expense.shares).map(([id, v]) => [
            id,
            String(Math.round((v / expense.amount) * 1000) / 10),
          ])
        )
      : {}
  );

  const numericAmount = parseFloat(amount) || 0;

  const toggleParticipant = (id: string) => {
    setParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exactSum = Array.from(participants).reduce((sum, id) => sum + (parseFloat(exact[id]) || 0), 0);
  const percentSum = Array.from(participants).reduce((sum, id) => sum + (parseFloat(percent[id]) || 0), 0);

  const canSubmit =
    description.trim() &&
    numericAmount > 0 &&
    paidBy &&
    participants.size > 0 &&
    (splitType === "equal" ||
      (splitType === "exact" && Math.abs(exactSum - numericAmount) < 0.02) ||
      (splitType === "percent" && Math.abs(percentSum - 100) < 0.5));

  const handleSubmit = () => {
    if (!canSubmit) return;
    const common = {
      groupId: group.id,
      description,
      amount: numericAmount,
      currency,
      paidBy,
      splitType,
      participantIds: Array.from(participants),
      exactShares:
        splitType === "exact"
          ? Object.fromEntries(Array.from(participants).map((id) => [id, parseFloat(exact[id]) || 0]))
          : undefined,
      percentShares:
        splitType === "percent"
          ? Object.fromEntries(Array.from(participants).map((id) => [id, parseFloat(percent[id]) || 0]))
          : undefined,
    };
    if (isEditing && expense) {
      updateExpense({ ...common, id: expense.id, date: expense.date });
    } else {
      addExpense(common);
    }
    onClose();
  };

  return (
    <Modal title={isEditing ? "Edit expense" : "Add an expense"} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <input
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Dinner at the beach shack"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
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

        <div>
          <label className="mb-1 block text-sm font-medium">Paid by</label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          >
            {groupMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Split</label>
          <div className="mb-2 flex gap-2 text-sm">
            {(["equal", "exact", "percent"] as SplitType[]).map((t) => (
              <button
                key={t}
                onClick={() => setSplitType(t)}
                className={`rounded-full px-3 py-1 ${
                  splitType === t
                    ? "bg-emerald-600 text-white"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800"
                }`}
              >
                {t === "equal" ? "Equally" : t === "exact" ? "Exact amounts" : "Percentages"}
              </button>
            ))}
          </div>

          <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-neutral-200 p-2 dark:border-neutral-700">
            {groupMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={participants.has(m.id)}
                  onChange={() => toggleParticipant(m.id)}
                />
                <span className="flex-1">{m.name}</span>
                {splitType === "exact" && participants.has(m.id) && (
                  <input
                    type="number"
                    value={exact[m.id] ?? ""}
                    onChange={(e) => setExact((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    placeholder="0.00"
                    className="w-20 rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
                  />
                )}
                {splitType === "percent" && participants.has(m.id) && (
                  <input
                    type="number"
                    value={percent[m.id] ?? ""}
                    onChange={(e) => setPercent((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    placeholder="%"
                    className="w-16 rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
                  />
                )}
              </div>
            ))}
          </div>
          {splitType === "exact" && (
            <p className="mt-1 text-xs text-neutral-500">
              {exactSum.toFixed(2)} / {numericAmount.toFixed(2)} assigned
            </p>
          )}
          {splitType === "percent" && (
            <p className="mt-1 text-xs text-neutral-500">{percentSum.toFixed(1)}% / 100% assigned</p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-md bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isEditing ? "Save changes" : "Add expense"}
        </button>
      </div>
    </Modal>
  );
}
