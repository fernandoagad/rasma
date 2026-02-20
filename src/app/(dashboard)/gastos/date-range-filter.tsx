"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function DateRangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page");
      router.push(`/gastos?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Desde</span>
      <input
        type="date"
        value={searchParams.get("dateFrom") || ""}
        onChange={(e) => handleChange("dateFrom", e.target.value)}
        className="text-sm border rounded-lg px-2.5 py-1.5 bg-white text-rasma-dark focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
      />
      <span className="text-sm font-medium text-muted-foreground">Hasta</span>
      <input
        type="date"
        value={searchParams.get("dateTo") || ""}
        onChange={(e) => handleChange("dateTo", e.target.value)}
        className="text-sm border rounded-lg px-2.5 py-1.5 bg-white text-rasma-dark focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
      />
    </div>
  );
}
