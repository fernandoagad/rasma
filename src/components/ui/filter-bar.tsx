"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  filters: FilterConfig[];
  basePath?: string;
}

export function FilterBar({ filters, basePath }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const path = basePath || pathname;

  const handleChange = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all" || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page");
      router.push(`${path}?${params.toString()}`);
    },
    [router, searchParams, path]
  );

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {filters.map((filter) => (
        <div key={filter.key} className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">{filter.label}</span>
          <select
            value={searchParams.get(filter.key) || "all"}
            onChange={(e) => handleChange(filter.key, e.target.value)}
            className="text-sm border rounded-lg px-2.5 py-1.5 bg-white text-rasma-dark focus:outline-none focus:ring-2 focus:ring-rasma-teal/30 cursor-pointer"
          >
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
