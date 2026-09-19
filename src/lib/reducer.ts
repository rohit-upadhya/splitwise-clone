import { Expense, Group, Member, Settlement } from "./types";

/** The slice of state that is shared across all devices (persisted in Blob). */
export type SharedState = {
  members: Member[];
  groups: Group[];
  expenses: Expense[];
  settlements: Settlement[];
};

export type Action =
  | { type: "addMember"; member: Member }
  | { type: "createGroup"; group: Group }
  | { type: "addMembersToGroup"; groupId: string; memberIds: string[] }
  | { type: "addExpense"; expense: Expense }
  | { type: "updateExpense"; expense: Expense }
  | { type: "deleteExpense"; expenseId: string }
  | { type: "recordSettlement"; settlement: Settlement };

export function emptyState(): SharedState {
  return { members: [], groups: [], expenses: [], settlements: [] };
}

/** Pure reducer — the single source of truth for how state changes. */
export function applyAction(state: SharedState, action: Action): SharedState {
  switch (action.type) {
    case "addMember":
      if (state.members.some((m) => m.id === action.member.id)) return state;
      return { ...state, members: [...state.members, action.member] };
    case "createGroup":
      if (state.groups.some((g) => g.id === action.group.id)) return state;
      return { ...state, groups: [...state.groups, action.group] };
    case "addMembersToGroup":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId
            ? { ...g, memberIds: Array.from(new Set([...g.memberIds, ...action.memberIds])) }
            : g
        ),
      };
    case "addExpense":
      if (state.expenses.some((e) => e.id === action.expense.id)) return state;
      return { ...state, expenses: [action.expense, ...state.expenses] };
    case "updateExpense":
      return {
        ...state,
        expenses: state.expenses.map((e) => (e.id === action.expense.id ? action.expense : e)),
      };
    case "deleteExpense":
      return { ...state, expenses: state.expenses.filter((e) => e.id !== action.expenseId) };
    case "recordSettlement":
      if (state.settlements.some((s) => s.id === action.settlement.id)) return state;
      return { ...state, settlements: [action.settlement, ...state.settlements] };
    default:
      return state;
  }
}

/** Initial shared data: the real "EU Trip" between You and Puberun. */
export function seedState(): SharedState {
  const me = "me";
  const pub = "puberun";
  return {
    members: [
      { id: me, name: "You" },
      { id: pub, name: "Puberun" },
    ],
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
  };
}
