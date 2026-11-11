import { useCallback, useEffect, useRef, useState } from "react";

// Loads data from an API function and re-runs when deps change.
// const { data, loading, error, reload } = useApi(() => clientApi.list({ page }), [page])
export function useApi(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const callId = useRef(0);

  const load = useCallback(async () => {
    const id = ++callId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (id === callId.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (id === callId.current) setState((s) => ({ ...s, loading: false, error }));
    }
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload: load };
}

// Debounces a fast-changing value (search boxes)
export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
