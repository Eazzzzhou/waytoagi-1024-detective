"use client";
import { useEffect, useRef, useState } from "react";

export function useRequestAction() {
  const active = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);
  async function run(operation: (signal: AbortSignal) => Promise<void>) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller; setBusy(true);
    try { await operation(controller.signal); }
    finally {
      if (active.current === controller) active.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return { busy, run };
}
