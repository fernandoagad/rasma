"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Mail, Phone, Calendar } from "lucide-react";
import { UI } from "@/constants/ui";
import { POSITION_OPTIONS } from "@/lib/validations/applicant";

interface Applicant {
  id: string;
  name: string;
  email: string;
  phone: string;
  positions: string;
  status: string;
  createdAt: Date;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  nuevo: "default",
  en_revision: "secondary",
  entrevista: "secondary",
  aceptado: "default",
  rechazado: "destructive",
  en_espera: "outline",
};

export function ApplicantList({ applicants }: { applicants: Applicant[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");

  const filtered = useMemo(() => {
    return applicants.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (positionFilter !== "all") {
        try {
          const positions = JSON.parse(a.positions) as string[];
          if (!positions.includes(positionFilter)) return false;
        } catch {
          return false;
        }
      }
      if (search) {
        const term = search.toLowerCase();
        if (
          !a.name.toLowerCase().includes(term) &&
          !a.email.toLowerCase().includes(term) &&
          !a.phone.includes(term)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [applicants, search, statusFilter, positionFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={UI.rrhh.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(UI.rrhh.statuses).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Puesto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los puestos</SelectItem>
            {POSITION_OPTIONS.map((pos) => (
              <SelectItem key={pos} value={pos}>{pos}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "postulante" : "postulantes"}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {UI.rrhh.noApplicants}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((applicant) => {
            let positions: string[] = [];
            try { positions = JSON.parse(applicant.positions); } catch { /* ignore */ }
            const statusLabel = UI.rrhh.statuses[applicant.status] || applicant.status;
            const variant = STATUS_VARIANTS[applicant.status] || "outline";

            return (
              <Link key={applicant.id} href={`/rrhh/postulantes/${applicant.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-rasma-dark truncate">{applicant.name}</h3>
                          <Badge variant={variant} className="text-xs shrink-0">{statusLabel}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {applicant.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {applicant.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {applicant.createdAt.toLocaleDateString("es-CL")}
                          </span>
                        </div>
                        {positions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {positions.map((pos) => (
                              <Badge key={pos} variant="outline" className="text-xs font-normal">{pos}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
