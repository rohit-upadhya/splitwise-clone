"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { useStore } from "@/lib/store";

export function NewGroupModal({ onClose }: { onClose: () => void }) {
  const members = useStore((s) => s.members);
  const addMember = useStore((s) => s.addMember);
  const createGroup = useStore((s) => s.createGroup);

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [friendName, setFriendName] = useState("");

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddFriend = () => {
    if (!friendName.trim()) return;
    const m = addMember(friendName.trim());
    setSelected((prev) => new Set(prev).add(m.id));
    setFriendName("");
  };

  const handleCreate = () => {
    if (!name.trim() || selected.size === 0) return;
    createGroup(name, Array.from(selected));
    onClose();
  };

  return (
    <Modal title="Create a group" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Group name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Goa Trip"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Members</label>
          <div className="mb-2 max-h-40 space-y-1 overflow-y-auto rounded-md border border-neutral-200 p-2 dark:border-neutral-700">
            {members.length === 0 && (
              <p className="text-sm text-neutral-400">No friends yet — add one below.</p>
            )}
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800">
                <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} />
                {m.name}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddFriend())}
              placeholder="Add a friend's name"
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
            <button
              onClick={handleAddFriend}
              className="rounded-md bg-neutral-800 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-700"
            >
              Add
            </button>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={!name.trim() || selected.size === 0}
          className="w-full rounded-md bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Create group
        </button>
      </div>
    </Modal>
  );
}
