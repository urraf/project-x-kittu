"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/admin/api";

/**
 * Fetches admin data for a URL. Loading is derived (no setState inside the
 * effect body), requests are aborted when the URL changes, and `mutate` allows
 * optimistic local updates.
 */
export function useApi<T>(url: string | null) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ key: string | null; data?: T; error?: string }>({ key: null });
  const key = url ? `${url}#${version}` : null;

  useEffect(() => {
    if (!url || !key) return;
    const ctrl = new AbortController();
    api<T>(url, { signal: ctrl.signal }).then(
      (data) => setState({ key, data }),
      (e: Error) => {
        if (e.name === "AbortError") return;
        toast.error(errorMessage(e));
        setState((s) => ({ ...s, key, error: errorMessage(e) }));
      },
    );
    return () => ctrl.abort();
  }, [url, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const mutate = useCallback((fn: (d: T | undefined) => T | undefined) => setState((s) => ({ ...s, data: fn(s.data) })), []);
  return { data: state.data, error: state.error, loading: state.key !== key, reload, mutate };
}

/** Current time that ticks every `ms`, safe to use during render. */
export function useNow(ms = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
