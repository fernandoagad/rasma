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
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {UI.common.showing} {start}–{end} {UI.common.of} {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {UI.common.previous}
        </Button>
        <span className="text-sm text-muted-foreground">
          {UI.common.page} {page} {UI.common.of} {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => goToPage(page + 1)}
        >
          {UI.common.next}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
