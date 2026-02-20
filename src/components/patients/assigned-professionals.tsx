"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { getCareTeamForPatient } from "@/actions/care-teams";
import { Users2, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type CareTeamMember = Awaited<ReturnType<typeof getCareTeamForPatient>>[number];

export function AssignedProfessionals({ patientId }: { patientId: string }) {
  const [members, setMembers] = useState<CareTeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCareTeamForPatient(patientId).then((m) => {
      setMembers(m);
      setLoading(false);
    });
  }, [patientId]);

  if (loading) return null;
  if (members.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users2 className="h-4 w-4" />
          Profesionales Asignados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-start gap-3 p-3 rounded-lg border">
              {member.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.user.image}
                  alt={member.user.name}
                  className="h-10 w-10 rounded-full object-cover shrink-0"
                />
              ) : (
                <AvatarInitials name={member.user.name} size="sm" className="h-10 w-10" />
              )}
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">{member.user.name}</p>
                {member.user.specialty && (
                  <Badge variant="outline" className="text-[10px]">{member.user.specialty}</Badge>
                )}
                {!member.user.specialty && member.user.role && (
                  <p className="text-[11px] text-muted-foreground capitalize">{member.user.role}</p>
                )}
                {member.user.email && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{member.user.email}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
