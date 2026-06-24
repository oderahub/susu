"use client";

import { useCallback, useEffect, useState } from "react";
import { connectWallet, disconnectWallet, getStxAddress } from "@/lib/wallet";

/**
 * Shared wallet state. Re-reads the address on window focus so the multi-account
 * demo works: switch accounts in Leather, tab back, and the active member updates.
 */
export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => setAddress(getStxAddress()), []);

  useEffect(() => {
    const onFocus = () => setAddress(getStxAddress());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      setAddress(await connectWallet());
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectWallet();
    setAddress(null);
  }, []);

  return { address, connect, disconnect, connecting, refresh: () => setAddress(getStxAddress()) };
}
