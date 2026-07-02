import { NextResponse } from "next/server";
import { isValidAddress } from "flowvault-sdk";
import { store } from "@/lib/store";

/** Record that a member contributed to a round (idempotent per address+round). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { address, round, txId } = body;
  if (typeof address !== "string" || !isValidAddress(address)) {
    return NextResponse.json({ error: "valid address required" }, { status: 400 });
  }
  if (typeof round !== "number" || !Number.isInteger(round) || round < 0) {
    return NextResponse.json({ error: "valid round required" }, { status: 400 });
  }

  const updated = await store.update(id, (c) => {
    const contributions = c.contributions ?? [];
    if (contributions.some((x) => x.address === address && x.round === round)) {
      return { ...c, contributions };
    }
    return {
      ...c,
      contributions: [
        ...contributions,
        { round, address, txId: typeof txId === "string" ? txId : "", at: Date.now() },
      ],
    };
  });

  if (!updated) return NextResponse.json({ error: "Circle not found" }, { status: 404 });
  return NextResponse.json({ circle: updated });
}
