"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Currency, Expense, Group, Member, Settlement, SplitType } from "./types";
import { Action, SharedState, applyAction, emptyState } from "./reducer";
import { computeShares } from "./shares";

function id() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

// Suppresses background polling from clobbering an in-flight optimistic update.
let mutatingUntil = 0;

type State = SharedState & {
  displayCurrency: Currency;
  currentUserId: string | null;
  loaded: boolean;

  load: () => Promise<void>;
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
};

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const applyServer = (server: SharedState) =>
        set({
          members: server.members,
          groups: server.groups,
          expenses: server.expenses,
          settlements: server.settlements,
        });

      async function postAction(action: Action) {
        mutatingUntil = Date.now() + 4000;
        try {
          const res = await fetch("/api/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action),
          });
          if (res.ok) applyServer((await res.json()) as SharedState);
        } catch {
          // Keep the optimistic state; the next poll will reconcile.
        }
      }

      function dispatch(action: Action) {
        const s = get();
        applyServer(
          applyAction(
            { members: s.members, groups: s.groups, expenses: s.expenses, settlements: s.settlements },
            action
          )
        );
        postAction(action);
      }

      return {
        ...emptyState(),
        displayCurrency: "USD",
        currentUserId: null,
        loaded: false,

        load: async () => {
          try {
            const res = await fetch("/api/state", { cache: "no-store" });
            if (!res.ok) {
              set({ loaded: true });
              return;
            }
            const server = (await res.json()) as SharedState;
            if (Date.now() < mutatingUntil) {
              set({ loaded: true });
              return;
            }
            applyServer(server);
            set({ loaded: true });
          } catch {
            set({ loaded: true });
          }
        },

        addMember: (name) => {
          const member: Member = { id: id(), name: name.trim() };
          dispatch({ type: "addMember", member });
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
          dispatch({ type: "createGroup", group });
          return group;
        },

        addMembersToGroup: (groupId, memberIds) =>
          dispatch({ type: "addMembersToGroup", groupId, memberIds }),

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
          const shares = computeShares(splitType, amount, participantIds, exactShares, percentShares);
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
          dispatch({ type: "addExpense", expense });
        },

        deleteExpense: (expenseId) => dispatch({ type: "deleteExpense", expenseId }),

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
          dispatch({ type: "recordSettlement", settlement });
        },

        setDisplayCurrency: (c) => set({ displayCurrency: c }),
        setCurrentUser: (memberId) => set({ currentUserId: memberId }),
      };
    },
    {
      name: "splitwise-clone-prefs",
      // Only personal UI prefs live in localStorage; shared data comes from the server.
      partialize: (s) => ({ displayCurrency: s.displayCurrency, currentUserId: s.currentUserId }),
    }
  )
);
