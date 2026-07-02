import { NextResponse } from "next/server";
import { deserializeTransaction, broadcastTransaction } from "@stacks/transactions";
import { NETWORK } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Broadcast a wallet-signed transaction server-side (no browser CORS). The
 * client signs with `stx_signTransaction` (broadcast:false) and posts the signed
 * hex here; we submit it and return the real txid.
 */
export async function POST(req: Request) {
  let body: { tx?: string };
  try {
    body = (await req.json()) as { tx?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const raw = body.tx;
  if (typeof raw !== "string" || !raw) {
    return NextResponse.json({ error: "tx (hex) is required" }, { status: 400 });
  }
  const hex = raw.startsWith("0x") ? raw.slice(2) : raw;

  try {
    const transaction = deserializeTransaction(hex);
    const result = (await broadcastTransaction({ transaction, network: NETWORK })) as {
      txid?: string;
      error?: string;
      reason?: string;
    };
    if (result.error) {
      return NextResponse.json({ error: result.reason ?? result.error, detail: result }, { status: 400 });
    }
    if (!result.txid) {
      return NextResponse.json({ error: "Broadcast returned no txid", detail: result }, { status: 502 });
    }
    return NextResponse.json({ txid: result.txid });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Broadcast failed" }, { status: 502 });
  }
}
