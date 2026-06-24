import { NextResponse } from "next/server";
import { isValidAddress } from "flowvault-sdk";
import { store } from "@/lib/store";

/** Join a circle. Idempotent for an address that's already a member. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { address, name } = body;
  if (typeof address !== "string" || !isValidAddress(address)) {
    return NextResponse.json({ error: "a valid address is required" }, { status: 400 });
  }
  const displayName = typeof name === "string" && name.trim() ? name.trim().slice(0, 40) : null;

  const updated = await store.update(id, (c) => {
    if (c.members.some((m) => m.address === address)) return c; // already in — no-op
    if (c.members.length >= c.seats) return c; // full — no-op
    return {
      ...c,
      members: [
        ...c.members,
        { name: displayName ?? `Member ${c.members.length + 1}`, address, reputation: 0, joinedAt: Date.now() },
      ],
    };
  });

  if (!updated) return NextResponse.json({ error: "Circle not found" }, { status: 404 });

  const isMember = updated.members.some((m) => m.address === address);
  if (!isMember) {
    return NextResponse.json({ error: "Circle is full", circle: updated }, { status: 409 });
  }
  return NextResponse.json({ circle: updated });
}
