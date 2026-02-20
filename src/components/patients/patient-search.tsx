"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { UI } from "@/constants/ui";
import { useCallback, useTransition } from "react";

export function PatientSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`/pacientes?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={UI.patients.searchPlaceholder}
          defaultValue={searchParams.get("q") || ""}
          onChange={(e) => {
            const timeout = setTimeout(() => {
              updateParams("q", e.target.value);
            }, 300);
            return () => clearTimeout(timeout);
          }}
          className="pl-9"
        />
      </div>
      <Select
        defaultValue={searchParams.get("status") || "all"}
        onValueChange={(value) => updateParams("status", value)}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder={UI.patients.status} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {Object.entries(UI.patients.statuses).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
