"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, ArrowRight, UserPlus, Loader2 } from "lucide-react";
import Link from "next/link";
import { PatientForm } from "./patient-form";
import { createPatient } from "@/actions/patients";

interface ExistingPatient {
  id: string;
  firstName: string;
  lastName: string;
  rut: string | null;
  email: string | null;
  status: string;
  primaryTherapist: { id: string; name: string } | null;
}

interface Props {
  therapists: { id: string; name: string }[];
  searchPatients: (query: string) => Promise<ExistingPatient[]>;
}

export function PatientSearchOrCreate({ therapists, searchPatients }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExistingPatient[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    try {
      const data = await searchPatients(q.trim());
      setResults(data);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }, [searchPatients]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  if (showForm) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="gap-1.5 text-muted-foreground">
          &larr; Volver a buscar
        </Button>
        <PatientForm therapists={therapists} action={createPatient} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search section */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-rasma-teal/10 mb-3">
              <Search className="h-6 w-6 text-rasma-teal" />
            </div>
            <h2 className="text-lg font-semibold">Buscar paciente existente</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Verifique si el paciente ya existe antes de crear uno nuevo
            </p>
          </div>

          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, RUT o email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search results */}
      {searched && (
        <div className="space-y-3">
          {results.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Se encontraron <span className="font-medium text-foreground">{results.length}</span> pacientes:
              </p>
              <div className="space-y-2">
                {results.map((patient) => (
                  <Link key={patient.id} href={`/pacientes/${patient.id}`}>
                    <Card className="py-0 gap-0 hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-0">
                        <div className="flex items-center gap-3 px-4 py-3">
                          <AvatarInitials name={`${patient.firstName} ${patient.lastName}`} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">
                              {patient.firstName} {patient.lastName}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {patient.rut && `RUT: ${patient.rut}`}
                              {patient.rut && patient.email && " · "}
                              {patient.email}
                              {patient.primaryTherapist && ` · ${patient.primaryTherapist.name}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusBadge type="patient" status={patient.status} />
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No se encontraron pacientes con &ldquo;{query}&rdquo;
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Create new button */}
      <div className="flex flex-col items-center gap-3 pt-2">
        {searched && (
          <div className="flex items-center gap-3 w-full max-w-xs">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">o</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        )}
        <Button
          variant={searched ? "default" : "outline"}
          onClick={() => setShowForm(true)}
          className="gap-1.5"
        >
          <UserPlus className="h-4 w-4" />
          Crear nuevo paciente
        </Button>
      </div>
    </div>
  );
}
