import { NextResponse } from "next/server";
import { getState, writeState } from "@/lib/db";
import { Action, applyAction } from "@/lib/reducer";

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

  // Read-modify-write against the shared document (seeds on first access).
  const current = await getState();
  const next = applyAction(current, action);
  await writeState(next);
  return NextResponse.json(next);
}
