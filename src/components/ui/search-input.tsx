"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export function SearchInput({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("search") || "";
  const [value, setValue] = useState(current);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setValue(current);
  }, [current]);

  function push(newValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (newValue) {
      params.set("search", newValue);
    } else {
      params.delete("search");
    }
    params.delete("page");
    router.push(`${basePath}?${params.toString()}`);
  }

  function handleChange(newValue: string) {
    setValue(newValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => push(newValue), 300);
  }

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Buscar..."
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="h-9 pl-8 pr-8 w-48 text-sm"
      />
      {value && (
        <button
          onClick={() => handleChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
