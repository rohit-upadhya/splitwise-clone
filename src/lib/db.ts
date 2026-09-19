import "server-only";
import { del, head, list, put } from "@vercel/blob";
import { Expense, Group, Member, Settlement } from "./types";
import { Action, SharedState, applyAction, emptyState, seedState } from "./reducer";

const token = process.env.BLOB_READ_WRITE_TOKEN;

const putOpts = {
  access: "public",
  token,
  allowOverwrite: true,
  addRandomSuffix: false,
  contentType: "application/json",
  cacheControlMaxAge: 0,
} as const;

// One blob per entity. Concurrent adds/deletes touch different keys, so there is
// no read-modify-write on shared state and no last-write-wins data loss.
const pathFor = {
  member: (id: string) => `members/${id}.json`,
  group: (id: string) => `groups/${id}.json`,
  expense: (id: string) => `expenses/${id}.json`,
  settlement: (id: string) => `settlements/${id}.json`,
};

async function fetchJson<T>(url: string): Promise<T | null> {
  // Cache-bust so a just-written change is never masked by an edge-cached copy.
  const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
  return res.ok ? ((await res.json()) as T) : null;
}

/** Assembles the full shared state by listing and reading every entity blob. */
export async function readState(): Promise<SharedState> {
  const { blobs } = await list({ token, limit: 1000 });
  const loaded = await Promise.all(
    blobs.map(async (b) => ({ path: b.pathname, data: await fetchJson<unknown>(b.url) }))
  );

  const state = emptyState();
  for (const { path, data } of loaded) {
    if (!data) continue;
    if (path.startsWith("members/")) state.members.push(data as Member);
    else if (path.startsWith("groups/")) state.groups.push(data as Group);
    else if (path.startsWith("expenses/")) state.expenses.push(data as Expense);
    else if (path.startsWith("settlements/")) state.settlements.push(data as Settlement);
  }

  const byDateDesc = (a: { date: string }, b: { date: string }) =>
    new Date(b.date).getTime() - new Date(a.date).getTime();
  state.expenses.sort(byDateDesc);
  state.settlements.sort(byDateDesc);
  return state;
}

async function hasGroups(): Promise<boolean> {
  const { blobs } = await list({ token, prefix: "groups/", limit: 1 });
  return blobs.length > 0;
}

/** Seeds the EU Trip once, on first ever access. */
export async function seedIfEmpty(): Promise<void> {
  if (await hasGroups()) return;
  const s = seedState();
  await Promise.all([
    ...s.members.map((m) => put(pathFor.member(m.id), JSON.stringify(m), putOpts)),
    ...s.groups.map((g) => put(pathFor.group(g.id), JSON.stringify(g), putOpts)),
    ...s.expenses.map((e) => put(pathFor.expense(e.id), JSON.stringify(e), putOpts)),
    ...s.settlements.map((x) => put(pathFor.settlement(x.id), JSON.stringify(x), putOpts)),
  ]);
}

export async function getState(): Promise<SharedState> {
  await seedIfEmpty();
  return readState();
}

/** Persists a single action to its own key(s). */
async function persistAction(action: Action): Promise<void> {
  switch (action.type) {
    case "addMember":
      await put(pathFor.member(action.member.id), JSON.stringify(action.member), putOpts);
      break;
    case "createGroup":
      await put(pathFor.group(action.group.id), JSON.stringify(action.group), putOpts);
      break;
    case "addExpense":
    case "updateExpense":
      // Same key — an update simply overwrites the entity's blob.
      await put(pathFor.expense(action.expense.id), JSON.stringify(action.expense), putOpts);
      break;
    case "recordSettlement":
      await put(pathFor.settlement(action.settlement.id), JSON.stringify(action.settlement), putOpts);
      break;
    case "deleteExpense":
      await del(pathFor.expense(action.expenseId), { token });
      break;
    case "addMembersToGroup": {
      // The only read-modify-write, scoped to one group doc; collisions require two
      // people editing the same group's membership within the same instant.
      const path = pathFor.group(action.groupId);
      try {
        const meta = await head(path, { token });
        const group = await fetchJson<Group>(meta.url);
        if (group) {
          group.memberIds = Array.from(new Set([...group.memberIds, ...action.memberIds]));
          await put(path, JSON.stringify(group), putOpts);
        }
      } catch {
        // group missing — nothing to update
      }
      break;
    }
  }
}

/**
 * Applies an action and returns the resulting state. The response is derived by
 * folding the action over a fresh read, so it always reflects the mutation even
 * if the blob list is briefly eventually-consistent after the write.
 */
export async function applyAndRead(action: Action): Promise<SharedState> {
  await seedIfEmpty();
  await persistAction(action);
  return applyAction(await readState(), action);
}
