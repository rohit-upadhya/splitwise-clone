import { Currency, Expense, Group, Settlement } from "./types";

/**
 * Per-currency net balances for every member of a group.
 * Positive = the group owes this member money. Negative = they owe the group.
 */
export function computeGroupBalancesByCurrency(
  group: Group,
  expenses: Expense[],
  settlements: Settlement[]
): Record<Currency, Record<string, number>> {
  const result: Partial<Record<Currency, Record<string, number>>> = {};

  const ensure = (currency: Currency) => {
    if (!result[currency]) {
      const zeroed: Record<string, number> = {};
      group.memberIds.forEach((id) => (zeroed[id] = 0));
      result[currency] = zeroed;
    }
    return result[currency]!;
  };

  for (const exp of expenses.filter((e) => e.groupId === group.id)) {
    const bal = ensure(exp.currency);
    bal[exp.paidBy] = (bal[exp.paidBy] ?? 0) + exp.amount;
    for (const [memberId, share] of Object.entries(exp.shares)) {
      bal[memberId] = (bal[memberId] ?? 0) - share;
    }
  }

  for (const s of settlements.filter((s) => s.groupId === group.id)) {
    const bal = ensure(s.currency);
    bal[s.from] = (bal[s.from] ?? 0) + s.amount;
    bal[s.to] = (bal[s.to] ?? 0) - s.amount;
  }

  return result as Record<Currency, Record<string, number>>;
}

export function convertAmount(
  amount: number,
  from: Currency,
  to: Currency,
  ratesFromUSD: Record<Currency, number>
): number {
  if (from === to) return amount;
  const amountInUsd = amount / ratesFromUSD[from];
  return amountInUsd * ratesFromUSD[to];
}

/** Net balance per member, converted into a single display currency. */
export function computeNetBalancesInCurrency(
  group: Group,
  expenses: Expense[],
  settlements: Settlement[],
  displayCurrency: Currency,
  ratesFromUSD: Record<Currency, number>
): Record<string, number> {
  const byCurrency = computeGroupBalancesByCurrency(group, expenses, settlements);
  const net: Record<string, number> = {};
  group.memberIds.forEach((id) => (net[id] = 0));

  for (const [currency, balances] of Object.entries(byCurrency)) {
    for (const [memberId, amount] of Object.entries(balances)) {
      net[memberId] =
        (net[memberId] ?? 0) +
        convertAmount(amount, currency as Currency, displayCurrency, ratesFromUSD);
    }
  }
  return net;
}

export type SettlementSuggestion = { from: string; to: string; amount: number };

/** Classic greedy debt-simplification: match biggest debtor with biggest creditor. */
export function simplifyDebts(netBalances: Record<string, number>): SettlementSuggestion[] {
  const EPS = 0.01;
  const entries = Object.entries(netBalances)
    .map(([id, amount]) => ({ id, amount: Math.round(amount * 100) / 100 }))
    .filter((e) => Math.abs(e.amount) > EPS);

  const debtors = entries.filter((e) => e.amount < 0).sort((a, b) => a.amount - b.amount);
  const creditors = entries.filter((e) => e.amount > 0).sort((a, b) => b.amount - a.amount);

  const suggestions: SettlementSuggestion[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(-debtor.amount, creditor.amount);
    if (amount > EPS) {
      suggestions.push({ from: debtor.id, to: creditor.id, amount: Math.round(amount * 100) / 100 });
    }
    debtor.amount += amount;
    creditor.amount -= amount;
    if (Math.abs(debtor.amount) <= EPS) i++;
    if (Math.abs(creditor.amount) <= EPS) j++;
  }
  return suggestions;
}
