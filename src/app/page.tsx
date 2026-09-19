"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { CurrencyTicker } from "@/components/CurrencyTicker";
import { NewGroupModal } from "@/components/NewGroupModal";
import { GroupView } from "@/components/GroupView";

export default function Home() {
  const groups = useStore((s) => s.groups);
  const members = useStore((s) => s.members);
  const seedDemo = useStore((s) => s.seedDemo);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [showNewGroup, setShowNewGroup] = useState(false);

  // Seed the EU Trip data on first load (no-op once you have your own groups).
  useEffect(() => {
    seedDemo();
  }, [seedDemo]);

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0] ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-lg font-bold text-white">
              S
            </div>
            <span className="text-lg font-semibold">Splitwise Clone</span>
          </div>
          <span className="text-sm text-neutral-500">{members.length} friends</span>
        </div>
      </header>

      <CurrencyTicker />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <aside className="space-y-2">
            <button
              onClick={() => setShowNewGroup(true)}
              className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              + New group
            </button>
            <div className="space-y-1">
              {groups.length === 0 && (
                <p className="px-2 py-4 text-sm text-neutral-400">
                  No groups yet. Create one to start splitting expenses.
                </p>
              )}
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveGroupId(g.id)}
                  className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                    activeGroup?.id === g.id
                      ? "bg-neutral-100 font-medium dark:bg-neutral-800"
                      : "hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  }`}
                >
                  {g.name}
                  <span className="ml-1 text-xs text-neutral-400">({g.memberIds.length})</span>
                </button>
              ))}
            </div>
          </aside>

          <section>
            {activeGroup ? (
              <GroupView group={activeGroup} />
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 text-center text-neutral-400 dark:border-neutral-700">
                <p className="mb-2 text-lg font-medium">Welcome 👋</p>
                <p className="max-w-sm text-sm">
                  Create a group, add friends, and start splitting expenses — with live EUR, USD,
                  INR &amp; BHD conversion.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="border-t border-neutral-200 px-4 py-3 text-center text-xs text-neutral-400 dark:border-neutral-800">
        Data is stored locally in your browser. Exchange rates via exchangerate-api.com.
      </footer>

      {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} />}
    </div>
  );
}
