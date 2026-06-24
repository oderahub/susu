import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const circle = await store.get(id);
  if (!circle) return NextResponse.json({ error: "Circle not found" }, { status: 404 });
  return NextResponse.json({ circle });
}
