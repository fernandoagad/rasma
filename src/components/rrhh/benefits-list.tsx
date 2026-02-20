"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { UI } from "@/constants/ui";
import { toggleBenefitActive } from "@/actions/staff";

interface Benefit {
  id: string;
  type: string;
  description: string;
  amount: number | null;
  startDate: string;
  endDate: string | null;
  active: boolean;
  userId: string;
  userName: string;
}

export function BenefitsList({ benefits }: { benefits: Benefit[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = benefits.filter((b) => {
    if (typeFilter !== "all" && b.type !== typeFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      if (!b.userName.toLowerCase().includes(term) && !b.description.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o descripción..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(UI.rrhh.benefitTypes).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} beneficios</p>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Sin beneficios registrados.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ben) => (
            <Card key={ben.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/rrhh/equipo/${ben.userId}`} className="font-semibold text-sm text-rasma-dark hover:underline">
                        {ben.userName}
                      </Link>
                      <Badge variant="outline" className="text-[10px]">
                        {UI.rrhh.benefitTypes[ben.type] || ben.type}
                      </Badge>
                      <Badge variant={ben.active ? "default" : "secondary"} className="text-[10px]">
                        {ben.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{ben.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {ben.startDate} {ben.endDate ? `→ ${ben.endDate}` : "→ indefinido"}
                      {ben.amount ? ` · $${ben.amount.toLocaleString("es-CL")} CLP` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs shrink-0"
                    disabled={isPending}
                    onClick={() => startTransition(async () => { await toggleBenefitActive(ben.id, ben.userId); router.refresh(); })}
                  >
                    {ben.active ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
