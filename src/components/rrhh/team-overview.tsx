"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Search, Calendar, Users, ChevronRight } from "lucide-react";
import { UI } from "@/constants/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  specialty: string | null;
  area: string | null;
  therapistStatus: string | null;
  attentionType: string | null;
  image: string | null;
  createdAt: Date;
  recentAppointments: number;
  activePatients: number;
}

export function TeamOverview({ team }: { team: TeamMember[] }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = team.filter((m) => {
    const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {Object.entries(UI.users.roles).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="py-0 gap-0 overflow-hidden">
        <div className="divide-y">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Sin resultados</div>
          ) : (
            filtered.map((member) => (
              <Link key={member.id} href={`/rrhh/equipo/${member.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer">
                {member.image ? (
                  <img src={member.image} alt={member.name} className="h-9 w-9 rounded-full object-cover shrink-0" />
                ) : (
                  <AvatarInitials name={member.name} size="sm" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <Badge variant={member.active ? "default" : "secondary"} className="text-[10px] h-5">
                      {UI.users.roles[member.role as keyof typeof UI.users.roles] || member.role}
                    </Badge>
                    {!member.active && <Badge variant="outline" className="text-[10px] h-5 text-red-500">Inactivo</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {member.email}
                    {member.specialty && ` · ${member.specialty}`}
                    {member.area && ` · ${member.area}`}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1" title="Citas últimos 30 días">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{member.recentAppointments}</span>
                  </div>
                  <div className="flex items-center gap-1" title="Pacientes activos">
                    <Users className="h-3.5 w-3.5" />
                    <span>{member.activePatients}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
