"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

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
    <div className="flex items-center gap-3 flex-wrap p-3 rounded-2xl border bg-white">
      {filters.map((filter) => {
        const current = searchParams.get(filter.key) || "all";
        const isFiltered = current !== "all";

        return (
          <div key={filter.key} className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground ml-1">{filter.label}</span>
            <select
              value={current}
              onChange={(e) => handleChange(filter.key, e.target.value)}
              className={cn(
                "text-sm border rounded-xl px-3 py-1.5 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-rasma-teal/30 cursor-pointer transition-colors",
                isFiltered
                  ? "border-rasma-dark/30 bg-rasma-dark text-rasma-lime font-medium"
                  : "border-zinc-200 text-rasma-dark hover:bg-zinc-100"
              )}
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
