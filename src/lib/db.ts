import "server-only";
import { head, put } from "@vercel/blob";
import { SharedState, seedState } from "./reducer";

const PATH = "splitwise-state.json";
const token = process.env.BLOB_READ_WRITE_TOKEN;

/** Reads the current shared state, or null if it hasn't been created yet. */
export async function readState(): Promise<SharedState | null> {
  try {
    const meta = await head(PATH, { token });
    // Cache-bust: a unique query key forces a fresh origin read every time, so a
    // just-written change is never masked by an edge-cached copy of the blob.
    const res = await fetch(`${meta.url}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as SharedState;
  } catch {
    // head() throws BlobNotFoundError before the state has ever been written.
    return null;
  }
}

export async function writeState(state: SharedState): Promise<void> {
  await put(PATH, JSON.stringify(state), {
    access: "public",
    token,
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });
}

/** Reads state, seeding the EU Trip on first ever access. */
export async function getState(): Promise<SharedState> {
  const existing = await readState();
  if (existing) return existing;
  const seeded = seedState();
  await writeState(seeded);
  return seeded;
}
