"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Currency, Expense, Group, Member, Settlement, SplitType } from "./types";

function id() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

type State = {
  members: Member[];
  groups: Group[];
  expenses: Expense[];
  settlements: Settlement[];
  displayCurrency: Currency;
  currentUserId: string | null;

  addMember: (name: string) => Member;
  createGroup: (name: string, memberIds: string[]) => Group;
  addMembersToGroup: (groupId: string, memberIds: string[]) => void;
  addExpense: (input: {
    groupId: string;
    description: string;
    amount: number;
    currency: Currency;
    paidBy: string;
    splitType: SplitType;
    participantIds: string[];
    exactShares?: Record<string, number>;
    percentShares?: Record<string, number>;
  }) => void;
  deleteExpense: (expenseId: string) => void;
  recordSettlement: (input: {
    groupId: string;
    from: string;
    to: string;
    amount: number;
    currency: Currency;
  }) => void;
  setDisplayCurrency: (c: Currency) => void;
  setCurrentUser: (memberId: string) => void;
  seedDemo: () => void;
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      members: [],
      groups: [],
      expenses: [],
      settlements: [],
      displayCurrency: "USD",
      currentUserId: null,

      addMember: (name) => {
        const member: Member = { id: id(), name: name.trim() };
        set((s) => ({ members: [...s.members, member] }));
        if (!get().currentUserId) set({ currentUserId: member.id });
        return member;
      },

      createGroup: (name, memberIds) => {
        const group: Group = {
          id: id(),
          name: name.trim(),
          memberIds,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ groups: [...s.groups, group] }));
        return group;
      },

      addMembersToGroup: (groupId, memberIds) => {
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? { ...g, memberIds: Array.from(new Set([...g.memberIds, ...memberIds])) }
              : g
          ),
        }));
      },

      addExpense: ({
        groupId,
        description,
        amount,
        currency,
        paidBy,
        splitType,
        participantIds,
        exactShares,
        percentShares,
      }) => {
        let shares: Record<string, number> = {};
        if (splitType === "equal") {
          const per = Math.round((amount / participantIds.length) * 100) / 100;
          const remainder = Math.round((amount - per * participantIds.length) * 100) / 100;
          participantIds.forEach((pid, idx) => {
            shares[pid] = per + (idx === 0 ? remainder : 0);
          });
        } else if (splitType === "exact") {
          shares = { ...exactShares };
        } else if (splitType === "percent") {
          participantIds.forEach((pid) => {
            const pct = percentShares?.[pid] ?? 0;
            shares[pid] = Math.round(((amount * pct) / 100) * 100) / 100;
          });
        }

        const expense: Expense = {
          id: id(),
          groupId,
          description: description.trim() || "Expense",
          amount,
          currency,
          paidBy,
          splitType,
          shares,
          date: new Date().toISOString(),
        };
        set((s) => ({ expenses: [expense, ...s.expenses] }));
      },

      deleteExpense: (expenseId) => {
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== expenseId) }));
      },

      recordSettlement: ({ groupId, from, to, amount, currency }) => {
        const settlement: Settlement = {
          id: id(),
          groupId,
          from,
          to,
          amount,
          currency,
          date: new Date().toISOString(),
        };
        set((s) => ({ settlements: [settlement, ...s.settlements] }));
      },

      setDisplayCurrency: (c) => set({ displayCurrency: c }),
      setCurrentUser: (memberId) => set({ currentUserId: memberId }),

      // Pre-loads the "EU Trip" group between You and Puberun from the real data.
      // Only runs on a fresh/empty store so it never clobbers your own edits.
      seedDemo: () => {
        if (get().groups.length > 0 || get().members.length > 0) return;
        const me = "me";
        const pub = "puberun";
        set({
          members: [
            { id: me, name: "You" },
            { id: pub, name: "Puberun" },
          ],
          currentUserId: me,
          groups: [
            {
              id: "eu-trip",
              name: "EU Trip",
              memberIds: [me, pub],
              createdAt: "2026-09-18T00:00:00.000Z",
            },
          ],
          expenses: [
            {
              id: "exp-energy",
              groupId: "eu-trip",
              description: "Energy bar",
              amount: 428,
              currency: "INR",
              paidBy: me,
              splitType: "equal",
              shares: { [me]: 214, [pub]: 214 },
              date: "2026-09-18T10:00:00.000Z",
            },
            {
              id: "exp-allianz",
              groupId: "eu-trip",
              description: "Allianz",
              amount: 50,
              currency: "EUR",
              paidBy: pub,
              splitType: "equal",
              shares: { [me]: 25, [pub]: 25 },
              date: "2026-09-18T09:00:00.000Z",
            },
            {
              id: "exp-food",
              groupId: "eu-trip",
              description: "Food airport",
              amount: 5.8,
              currency: "BHD",
              paidBy: me,
              splitType: "exact",
              shares: { [me]: 1.9, [pub]: 3.9 },
              date: "2026-09-18T08:00:00.000Z",
            },
            {
              id: "exp-nevk",
              groupId: "eu-trip",
              description: "Nevk pillow",
              amount: 2385,
              currency: "INR",
              paidBy: me,
              splitType: "equal",
              shares: { [me]: 1192.5, [pub]: 1192.5 },
              date: "2026-09-18T07:00:00.000Z",
            },
          ],
          settlements: [],
        });
      },
    }),
    { name: "splitwise-clone-store" }
  )
);
