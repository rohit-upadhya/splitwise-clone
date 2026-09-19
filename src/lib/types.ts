export type Currency = "USD" | "EUR" | "INR" | "AED";

export const CURRENCIES: { code: Currency; label: string; symbol: string; flag: string }[] = [
  { code: "USD", label: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", label: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "INR", label: "Indian Rupee", symbol: "₹", flag: "🇮🇳" },
  { code: "AED", label: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪" },
];

export type Member = {
  id: string;
  name: string;
};

export type Group = {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string;
};

export type SplitType = "equal" | "exact" | "percent";

export type Expense = {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: Currency;
  paidBy: string;
  splitType: SplitType;
  shares: Record<string, number>; // memberId -> owed amount in expense currency
  date: string;
};

export type Settlement = {
  id: string;
  groupId: string;
  from: string;
  to: string;
  amount: number;
  currency: Currency;
  date: string;
};

export type RatesResponse = {
  base: Currency;
  rates: Record<Currency, number>;
  updatedAt: string;
};
