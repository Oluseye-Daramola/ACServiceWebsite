import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDebounced } from "./useApi";

// Keeps list filters (page, status, search…) in the URL so links and Back work.
// `search` is a debounced text box synced to ?search=
export function useListParams(defaults = {}) {
  const [sp, setSp] = useSearchParams();
  const params = { page: "1", ...defaults, ...Object.fromEntries(sp.entries()) };

  const setParam = (key, value) => {
    setSp(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === "" || value === undefined || value === null) next.delete(key);
        else next.set(key, value);
        if (key !== "page") next.delete("page"); // filters reset to page 1
        return next;
      },
      { replace: true }
    );
  };

  const [search, setSearch] = useState(sp.get("search") || "");
  const dsearch = useDebounced(search);
  useEffect(() => {
    if (dsearch !== (sp.get("search") || "")) setParam("search", dsearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsearch]);

  return { params, setParam, key: sp.toString(), search, setSearch };
}
