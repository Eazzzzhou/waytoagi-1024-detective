"use client";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { errorMessage, NetworkError, readApi } from "./api-client";

/** Only reads are retried automatically. POST operations must remain user initiated. */
export function useApiResource<T>(url: string | null, schema: z.ZodType<T>, revision: number, shouldPoll?: (data: T) => boolean) {
  const [state, setState] = useState<{ url: string | null; revision: number; data: T | null; error: string | null; readAt: string | null; stopped: boolean }>({ url: null, revision: -1, data: null, error: null, readAt: null, stopped: false });
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let retries = 0;
    async function read() {
      try {
        const data = await readApi(url!, schema, { signal: controller.signal });
        if (controller.signal.aborted) return;
        retries = 0;
        setState({ url, revision, data, error: null, readAt: new Date().toISOString(), stopped: false });
        if (shouldPoll?.(data)) timer = setTimeout(read, 2000);
      } catch (error) {
        if (controller.signal.aborted) return;
        const retry = error instanceof NetworkError && retries < 3;
        setState((previous) => ({ url, revision, data: previous.url === url ? previous.data : null, readAt: previous.url === url ? previous.readAt : null, error: errorMessage(error), stopped: !retry }));
        if (retry) { retries++; timer = setTimeout(read, 2000); }
      }
    }
    void read();
    return () => { controller.abort(); if (timer !== undefined) clearTimeout(timer); };
  }, [url, schema, revision, shouldPoll]);
  return state.url === url ? { ...state, loading: state.revision !== revision } : { data: null, error: null, readAt: null, stopped: false, loading: url !== null };
}
