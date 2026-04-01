"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UI } from "@/constants/ui";

interface PaginationProps {
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
}

export function Pagination({ total, page, totalPages, pageSize }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", p.toString());
    router.push(`/pacientes?${params.toString()}`);
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between rounded-2xl border bg-white px-5 py-3">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-rasma-dark tabular-nums">{start}–{end}</span>
        {" "}{UI.common.of}{" "}
        <span className="font-semibold text-rasma-dark tabular-nums">{total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
          className="rounded-xl h-9 px-3"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">{UI.common.previous}</span>
        </Button>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => goToPage(pageNum)}
                className={`h-9 w-9 rounded-xl text-sm font-medium transition-colors ${
                  pageNum === page
                    ? "bg-rasma-dark text-rasma-lime"
                    : "text-muted-foreground hover:bg-zinc-100"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => goToPage(page + 1)}
          className="rounded-xl h-9 px-3"
        >
          <span className="hidden sm:inline mr-1">{UI.common.next}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
