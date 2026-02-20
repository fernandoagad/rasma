"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Users, User, Calendar } from "lucide-react";
import { globalSearch } from "@/actions/global-search";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusBadge } from "@/components/ui/status-badge";

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof globalSearch>>>({
    patients: [],
    professionals: [],
    appointments: [],
  });
  const [loading, setLoading] = useState(false);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults({ patients: [], professionals: [], appointments: [] });
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      const r = await globalSearch(query);
      setResults(r);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const navigate = useCallback(
    (path: string) => {
      router.push(path);
      onOpenChange(false);
      setQuery("");
    },
    [router, onOpenChange]
  );

  const hasResults =
    results.patients.length > 0 ||
    results.professionals.length > 0 ||
    results.appointments.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pacientes, profesionales, citas..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Buscando...
            </div>
          )}

          {!loading && query.length >= 2 && !hasResults && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading && hasResults && (
            <div className="py-2">
              {/* Patients */}
              {results.patients.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Users className="h-3 w-3" /> Pacientes
                  </div>
                  {results.patients.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/pacientes/${p.id}`)}
                      className="flex items-center gap-3 w-full px-4 py-2 hover:bg-muted/50 text-left transition-colors"
                    >
                      <AvatarInitials name={`${p.firstName} ${p.lastName}`} size="sm" className="h-7 w-7 text-[10px]" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{p.firstName} {p.lastName}</span>
                        {p.rut && (
                          <span className="text-xs text-muted-foreground ml-2">{p.rut}</span>
                        )}
                      </div>
                      <StatusBadge type="patient" status={p.status} />
                    </button>
                  ))}
                </div>
              )}

              {/* Professionals */}
              {results.professionals.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <User className="h-3 w-3" /> Profesionales
                  </div>
                  {results.professionals.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => navigate(`/configuracion/usuarios`)}
                      className="flex items-center gap-3 w-full px-4 py-2 hover:bg-muted/50 text-left transition-colors"
                    >
                      {u.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.image} alt={u.name} className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <AvatarInitials name={u.name} size="sm" className="h-7 w-7 text-[10px]" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{u.name}</span>
                        {u.specialty && (
                          <span className="text-xs text-muted-foreground ml-2">{u.specialty}</span>
                        )}
                      </div>
                      <StatusBadge type="role" status={u.role} />
                    </button>
                  ))}
                </div>
              )}

              {/* Appointments */}
              {results.appointments.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="h-3 w-3" /> Citas
                  </div>
                  {results.appointments.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => navigate(`/citas/${a.id}`)}
                      className="flex items-center gap-3 w-full px-4 py-2 hover:bg-muted/50 text-left transition-colors"
                    >
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">
                          {a.patient.firstName} {a.patient.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          con {a.therapist.name}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.dateTime).toLocaleDateString("es-CL", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
