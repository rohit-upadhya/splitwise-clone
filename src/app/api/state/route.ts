import { NextResponse } from "next/server";
import { applyAndRead, getState } from "@/lib/db";
import { Action } from "@/lib/reducer";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getState();
  return NextResponse.json(state);
}

export async function POST(req: Request) {
  let action: Action;
  try {
    action = (await req.json()) as Action;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Each action persists to its own key — no shared read-modify-write, no race.
  const next = await applyAndRead(action);
  return NextResponse.json(next);
}
