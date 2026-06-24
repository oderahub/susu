import { NextResponse } from "next/server";
import { isValidAddress } from "flowvault-sdk";
import { store, type StoredCircle } from "@/lib/store";

/** List circles (newest first) — for the discovery view. */
export async function GET() {
  const circles = await store.list();
  circles.sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ circles });
}

/** Create a circle. The creator becomes its first member. */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, contribution, save, seats, creator, creatorName } = body;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const amount = Number(contribution);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "dues must be greater than 0" }, { status: 400 });
  }
  const saveAmount = Number(save);
  if (!Number.isFinite(saveAmount) || saveAmount < 0) {
    return NextResponse.json({ error: "savings must be 0 or greater" }, { status: 400 });
  }
  const seatCount = Number(seats);
  if (!Number.isInteger(seatCount) || seatCount < 2 || seatCount > 12) {
    return NextResponse.json({ error: "seats must be an integer between 2 and 12" }, { status: 400 });
  }
  if (typeof creator !== "string" || !isValidAddress(creator)) {
    return NextResponse.json({ error: "a valid creator address is required" }, { status: 400 });
  }

  const now = Date.now();
  const circle: StoredCircle = {
    id: crypto.randomUUID().slice(0, 8),
    name: name.trim().slice(0, 60),
    contribution: String(contribution),
    save: String(saveAmount),
    seats: seatCount,
    creator,
    createdAt: now,
    members: [
      {
        name: typeof creatorName === "string" && creatorName.trim() ? creatorName.trim().slice(0, 40) : "Organizer",
        address: creator,
        reputation: 0,
        joinedAt: now,
      },
    ],
  };

  await store.create(circle);
  return NextResponse.json({ circle }, { status: 201 });
}
