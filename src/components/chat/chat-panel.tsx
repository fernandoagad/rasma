"use client";

import { useEffect, useState, useRef, useCallback, useOptimistic, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Send, ArrowLeft, MessageSquare, Loader2, Users, User, Search, Plus } from "lucide-react";
import { getMyTeams, getCareTeamMessages, sendCareTeamMessage, joinCareTeam } from "@/actions/care-teams";
import { getDirectMessageThreads, getDirectMessages, sendDirectMessage, searchStaffForChat, listAllStaff } from "@/actions/direct-messages";
import { searchExistingPatients, listActivePatients } from "@/actions/patients";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Team = Awaited<ReturnType<typeof getMyTeams>>[number];
type CareMessage = Awaited<ReturnType<typeof getCareTeamMessages>>[number];
type DMThread = Awaited<ReturnType<typeof getDirectMessageThreads>>[number];
type DMMessage = Awaited<ReturnType<typeof getDirectMessages>>[number];

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "ahora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

type ActiveView =
  | { type: "list" }
  | { type: "team-chat"; patientId: string }
  | { type: "dm-chat"; partnerId: string; partnerName: string }
  | { type: "search" };

export function ChatPanel({
  open,
  onOpenChange,
  userRole = "admin",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string;
}) {
  const isPatient = userRole === "paciente";
  const [tab, setTab] = useState<"equipos" | "directos">("equipos");
  const [teams, setTeams] = useState<Team[]>([]);
  const [dmThreads, setDmThreads] = useState<DMThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ActiveView>({ type: "list" });

  // Care team messages
  const [careMessages, setCareMessages] = useState<CareMessage[]>([]);
  const [optimisticCare, addOptimisticCare] = useOptimistic(
    careMessages,
    (state: CareMessage[], newMsg: CareMessage) => [...state, newMsg]
  );

  // DM messages
  const [dmMessages, setDmMessages] = useState<DMMessage[]>([]);

  const [newMessage, setNewMessage] = useState("");
  const [, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ staff: Awaited<ReturnType<typeof searchStaffForChat>>; patients: Awaited<ReturnType<typeof searchExistingPatients>> }>({ staff: [], patients: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load data when panel opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      if (isPatient) {
        getMyTeams().then((t) => {
          setTeams(t);
          setLoading(false);
        }).catch(() => setLoading(false));
      } else {
        Promise.all([getMyTeams(), getDirectMessageThreads()]).then(([t, d]) => {
          setTeams(t);
          setDmThreads(d);
          setLoading(false);
        }).catch(() => setLoading(false));
      }
    } else {
      setView({ type: "list" });
      setCareMessages([]);
      setDmMessages([]);
      setNewMessage("");
      setSearchQuery("");
    }
  }, [open, isPatient]);

  // Load care team messages
  const loadCareMessages = useCallback(async (patientId: string) => {
    const msgs = await getCareTeamMessages(patientId);
    setCareMessages(msgs.reverse());
  }, []);

  // Load DM messages
  const loadDmMessages = useCallback(async (partnerId: string) => {
    const msgs = await getDirectMessages(partnerId);
    setDmMessages(msgs);
  }, []);

  // Load messages based on view
  useEffect(() => {
    if (view.type === "team-chat") {
      loadCareMessages(view.patientId);
    } else if (view.type === "dm-chat") {
      loadDmMessages(view.partnerId);
    }
  }, [view, loadCareMessages, loadDmMessages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [optimisticCare, dmMessages]);

  // Polling
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (view.type === "team-chat") {
      pollRef.current = setInterval(() => loadCareMessages(view.patientId), 3000);
    } else if (view.type === "dm-chat") {
      pollRef.current = setInterval(() => loadDmMessages(view.partnerId), 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [view, loadCareMessages, loadDmMessages]);

  // Focus input
  useEffect(() => {
    if (view.type === "team-chat" || view.type === "dm-chat") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [view]);

  // Load default contacts when search view opens, then filter on typing
  useEffect(() => {
    if (view.type !== "search") return;
    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    const query = searchQuery.trim();

    if (query.length === 0) {
      // Load all staff + active patients by default
      setSearchLoading(true);
      Promise.all([listAllStaff(), listActivePatients()]).then(([staff, patients]) => {
        setSearchResults({ staff, patients });
        setSearchLoading(false);
      }).catch(() => setSearchLoading(false));
      return;
    }

    if (query.length < 2) return; // Wait for 2+ chars before searching

    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      const [staff, patients] = await Promise.all([
        searchStaffForChat(query),
        searchExistingPatients(query),
      ]);
      setSearchResults({ staff, patients });
      setSearchLoading(false);
    }, 300);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [searchQuery, view.type]);

  const handleSendCare = useCallback(() => {
    if (view.type !== "team-chat" || !newMessage.trim()) return;
    const content = newMessage.trim();
    const patientId = view.patientId;
    setNewMessage("");

    startTransition(async () => {
      addOptimisticCare({
        id: `temp-${Date.now()}`,
        patientId,
        senderId: "me",
        content,
        createdAt: new Date(),
        sender: { id: "me", name: "Tu", image: null },
      } as CareMessage);
      await sendCareTeamMessage(patientId, content);
      await loadCareMessages(patientId);
    });
  }, [view, newMessage, addOptimisticCare, loadCareMessages, startTransition]);

  const handleSendDM = useCallback(() => {
    if (view.type !== "dm-chat" || !newMessage.trim()) return;
    const content = newMessage.trim();
    const partnerId = view.partnerId;
    setNewMessage("");

    startTransition(async () => {
      await sendDirectMessage(partnerId, content);
      await loadDmMessages(partnerId);
    });
  }, [view, newMessage, loadDmMessages, startTransition]);

  const handleSend = view.type === "team-chat" ? handleSendCare : handleSendDM;

  const handleStartPatientChat = async (patientId: string) => {
    await joinCareTeam(patientId);
    const t = await getMyTeams();
    setTeams(t);
    setView({ type: "team-chat", patientId });
  };

  const selectedTeam = view.type === "team-chat" ? teams.find((t) => t.patientId === view.patientId) : null;

  const headerTitle = (() => {
    switch (view.type) {
      case "team-chat":
        return selectedTeam ? `${selectedTeam.patient.firstName} ${selectedTeam.patient.lastName}` : "Equipo";
      case "dm-chat":
        return view.partnerName;
      case "search":
        return "Nueva conversacion";
      default:
        return "Mensajes";
    }
  })();

  const showBack = view.type !== "list";
  const currentMessages = view.type === "team-chat" ? optimisticCare : dmMessages;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] max-w-full p-0 flex flex-col">

        {/* ═══ Header ═══ */}
        <SheetTitle className="flex items-center gap-3 h-16 px-5 border-b shrink-0 bg-rasma-dark text-white">
          {showBack ? (
            <>
              <button
                onClick={() => { setView({ type: "list" }); setSearchQuery(""); }}
                className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-base truncate block">{headerTitle}</span>
                {view.type === "team-chat" && (
                  <span className="text-xs text-zinc-400 font-medium">Equipo de atencion</span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-white/10">
                <MessageSquare className="h-5 w-5 text-rasma-lime" />
              </div>
              <span className="font-bold text-base flex-1">{headerTitle}</span>
              {!isPatient && (
                <button
                  onClick={() => setView({ type: "search" })}
                  className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-white/10 transition-colors"
                  title="Nueva conversacion"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </>
          )}
        </SheetTitle>

        {/* ═══ List View ═══ */}
        {view.type === "list" && (
          <>
            {/* Tabs */}
            {!isPatient ? (
              <div className="flex border-b shrink-0">
                <button
                  onClick={() => setTab("equipos")}
                  className={cn(
                    "flex-1 py-3 text-sm font-semibold text-center transition-colors",
                    tab === "equipos"
                      ? "border-b-2 border-rasma-dark text-rasma-dark"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Users className="h-4 w-4 inline mr-1.5" />
                  Equipos
                </button>
                <button
                  onClick={() => setTab("directos")}
                  className={cn(
                    "flex-1 py-3 text-sm font-semibold text-center transition-colors",
                    tab === "directos"
                      ? "border-b-2 border-rasma-dark text-rasma-dark"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <User className="h-4 w-4 inline mr-1.5" />
                  Directos
                  {dmThreads.some((t) => t.unread) && (
                    <span className="ml-1.5 inline-flex h-2.5 w-2.5 rounded-full bg-rasma-red" />
                  )}
                </button>
              </div>
            ) : (
              <div className="border-b shrink-0 py-3 px-5 text-sm font-semibold text-rasma-dark">
                <Users className="h-4 w-4 inline mr-1.5" />
                Equipo de Atencion
              </div>
            )}

            {/* Thread list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : tab === "equipos" ? (
                teams.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
                    <div className="h-14 w-14 rounded-2xl bg-rasma-gray-100 flex items-center justify-center mb-4">
                      <Users className="h-7 w-7 text-rasma-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-rasma-dark mb-1">Sin equipos de atencion</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {isPatient ? "No tienes un equipo asignado aun." : "No perteneces a ningun equipo aun."}
                    </p>
                    {!isPatient && (
                      <Button variant="outline" onClick={() => setView({ type: "search" })} className="gap-2 h-10 rounded-xl font-semibold">
                        <Search className="h-4 w-4" /> Buscar paciente
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y">
                    {teams.map((team) => {
                      const patientName = `${team.patient.firstName} ${team.patient.lastName}`;
                      return (
                        <button
                          key={team.patientId}
                          onClick={() => setView({ type: "team-chat", patientId: team.patientId })}
                          className="flex items-center gap-3 w-full px-5 py-3.5 hover:bg-rasma-gray-100/60 text-left transition-colors"
                        >
                          <AvatarInitials name={patientName} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate text-rasma-dark">{patientName}</p>
                            {team.lastMessage ? (
                              <p className="text-sm text-muted-foreground truncate">
                                <span className="font-medium">{team.lastMessage.senderName}:</span> {team.lastMessage.content}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">Sin mensajes</p>
                            )}
                          </div>
                          {team.lastMessage && (
                            <span className="text-xs text-muted-foreground shrink-0 font-medium">
                              {timeAgo(team.lastMessage.createdAt)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                dmThreads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
                    <div className="h-14 w-14 rounded-2xl bg-rasma-gray-100 flex items-center justify-center mb-4">
                      <User className="h-7 w-7 text-rasma-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-rasma-dark mb-1">Sin conversaciones</p>
                    <p className="text-sm text-muted-foreground mb-4">Inicia un mensaje directo.</p>
                    <Button variant="outline" onClick={() => setView({ type: "search" })} className="gap-2 h-10 rounded-xl font-semibold">
                      <Search className="h-4 w-4" /> Buscar persona
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {dmThreads.map((thread) => (
                      <button
                        key={thread.partnerId}
                        onClick={() => setView({ type: "dm-chat", partnerId: thread.partnerId, partnerName: thread.partner.name })}
                        className={cn(
                          "flex items-center gap-3 w-full px-5 py-3.5 text-left transition-colors",
                          thread.unread ? "bg-zinc-50 hover:bg-zinc-100" : "hover:bg-rasma-gray-100/60"
                        )}
                      >
                        {thread.partner.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thread.partner.image} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <AvatarInitials name={thread.partner.name} size="md" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm truncate", thread.unread ? "font-bold text-rasma-dark" : "font-semibold")}>{thread.partner.name}</p>
                          <p className={cn("text-sm truncate", thread.unread ? "text-rasma-dark font-medium" : "text-muted-foreground")}>
                            {thread.lastMessage.isFromMe ? "Tu: " : ""}{thread.lastMessage.content}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="text-xs text-muted-foreground font-medium">
                            {timeAgo(thread.lastMessage.createdAt)}
                          </span>
                          {thread.unread && <span className="h-2.5 w-2.5 rounded-full bg-rasma-dark" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          </>
        )}

        {/* ═══ Search View ═══ */}
        {view.type === "search" && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar por nombre..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-rasma-gray-100 rounded-xl outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-rasma-dark/30 transition-shadow"
                  autoFocus
                />
                {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </div>

            {searchLoading && searchResults.staff.length === 0 && searchResults.patients.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="divide-y">
                {searchResults.staff.length > 0 && (
                  <>
                    <div className="px-5 py-2.5 bg-rasma-gray-100/60">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personal</p>
                    </div>
                    {searchResults.staff.map((person) => (
                      <button
                        key={person.id}
                        onClick={() => setView({ type: "dm-chat", partnerId: person.id, partnerName: person.name })}
                        className="flex items-center gap-3 w-full px-5 py-3.5 hover:bg-rasma-gray-100/60 text-left transition-colors"
                      >
                        {person.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={person.image} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <AvatarInitials name={person.name} size="md" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{person.name}</p>
                          <p className="text-xs text-muted-foreground font-medium">
                            {person.specialty || person.role}
                          </p>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {searchResults.patients.length > 0 && (
                  <>
                    <div className="px-5 py-2.5 bg-rasma-gray-100/60">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pacientes</p>
                    </div>
                    {searchResults.patients.map((patient) => (
                      <button
                        key={patient.id}
                        onClick={() => handleStartPatientChat(patient.id)}
                        className="flex items-center gap-3 w-full px-5 py-3.5 hover:bg-rasma-gray-100/60 text-left transition-colors"
                      >
                        <AvatarInitials name={`${patient.firstName} ${patient.lastName}`} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{patient.firstName} {patient.lastName}</p>
                          <p className="text-xs text-muted-foreground font-medium">
                            {patient.rut || patient.email || ""}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0 font-medium">
                          {patient.status === "activo" ? "Activo" : patient.status === "inactivo" ? "Inactivo" : "Alta"}
                        </Badge>
                      </button>
                    ))}
                  </>
                )}

                {!searchLoading && searchResults.staff.length === 0 && searchResults.patients.length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      {searchQuery.trim() ? <>Sin resultados para &ldquo;{searchQuery}&rdquo;</> : "No hay contactos disponibles"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ Message Thread ═══ */}
        {(view.type === "team-chat" || view.type === "dm-chat") && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-rasma-gray-100/40">
              {currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="h-12 w-12 rounded-2xl bg-white border border-border/60 flex items-center justify-center mb-3">
                    <MessageSquare className="h-5 w-5 text-rasma-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Inicia la conversacion</p>
                </div>
              ) : (
                currentMessages.map((msg) => {
                  const isTemp = msg.id.startsWith("temp-");
                  return (
                    <div key={msg.id} className={cn("flex items-start gap-3", isTemp && "opacity-50")}>
                      {msg.sender.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={msg.sender.image}
                          alt={msg.sender.name}
                          className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5"
                        />
                      ) : (
                        <AvatarInitials name={msg.sender.name} size="sm" className="shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0 bg-white rounded-2xl rounded-tl-md px-4 py-2.5 border border-border/40 shadow-sm">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-rasma-dark">{msg.sender.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {isTemp ? "enviando..." : timeAgo(msg.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="border-t bg-white px-4 py-3 shrink-0">
              <div className="flex items-center gap-2 bg-rasma-gray-100 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-rasma-dark/30 transition-shadow">
                <input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground py-1"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim()}
                  className={cn(
                    "flex items-center justify-center h-9 w-9 rounded-lg shrink-0 transition-all",
                    newMessage.trim()
                      ? "bg-rasma-dark text-white hover:bg-rasma-dark/90 shadow-sm"
                      : "text-muted-foreground/40"
                  )}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
