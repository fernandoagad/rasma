"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { UI } from "@/constants/ui";

interface Evaluation {
  id: string;
  period: string;
  score: number | null;
  status: string;
  strengths: string | null;
  areasToImprove: string | null;
  goals: string | null;
  comments: string | null;
  createdAt: Date;
  userName: string;
  userId: string;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  borrador: "outline",
  completada: "default",
  revisada: "secondary",
};

export function EvaluationsList({ evaluations }: { evaluations: Evaluation[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = evaluations.filter((ev) => {
    if (statusFilter !== "all" && ev.status !== statusFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      if (!ev.userName.toLowerCase().includes(term) && !ev.period.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o período..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(UI.rrhh.evalStatuses).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} evaluaciones</p>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Sin evaluaciones registradas.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ev) => (
            <Link key={ev.id} href={`/rrhh/equipo/${ev.userId}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-rasma-dark">{ev.userName}</h3>
                        <Badge variant={STATUS_VARIANTS[ev.status] || "outline"} className="text-[10px]">
                          {UI.rrhh.evalStatuses[ev.status] || ev.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Período: {ev.period}</p>
                      {ev.strengths && <p className="text-xs text-muted-foreground truncate">Fortalezas: {ev.strengths}</p>}
                    </div>
                    {ev.score && (
                      <div className="flex items-center gap-1 shrink-0">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div key={n} className={`h-2 w-4 rounded-full ${n <= ev.score! ? "bg-rasma-teal" : "bg-muted"}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
