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
import { getDirectMessageThreads, getDirectMessages, sendDirectMessage, searchStaffForChat } from "@/actions/direct-messages";
import { searchExistingPatients } from "@/actions/patients";
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
        // Patients only see care team chats, no DMs
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

  // Search
  useEffect(() => {
    if (view.type !== "search") return;
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (searchQuery.trim().length < 2) {
      setSearchResults({ staff: [], patients: [] });
      return;
    }
    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      const [staff, patients] = await Promise.all([
        searchStaffForChat(searchQuery.trim()),
        searchExistingPatients(searchQuery.trim()),
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
    // Auto-join care team, then open chat
    await joinCareTeam(patientId);
    // Refresh teams
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
      <SheetContent side="right" className="w-96 p-0 flex flex-col">
        {/* Header */}
        <SheetTitle className="flex items-center gap-3 h-12 px-4 border-b shrink-0">
          {showBack ? (
            <>
              <button onClick={() => { setView({ type: "list" }); setSearchQuery(""); }} className="hover:bg-muted rounded p-1">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold text-sm truncate">{headerTitle}</span>
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4" />
              <span className="font-semibold text-sm flex-1">{headerTitle}</span>
              {!isPatient && (
                <button
                  onClick={() => setView({ type: "search" })}
                  className="hover:bg-muted rounded p-1.5"
                  title="Nueva conversacion"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </SheetTitle>

        {view.type === "list" && (
          <>
            {/* Tabs — hide Directos for patients */}
            {!isPatient ? (
              <div className="flex border-b shrink-0">
                <button
                  onClick={() => setTab("equipos")}
                  className={cn(
                    "flex-1 py-2 text-xs font-medium text-center transition-colors",
                    tab === "equipos" ? "border-b-2 border-rasma-teal text-rasma-teal" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Users className="h-3.5 w-3.5 inline mr-1" />
                  Equipos
                </button>
                <button
                  onClick={() => setTab("directos")}
                  className={cn(
                    "flex-1 py-2 text-xs font-medium text-center transition-colors",
                    tab === "directos" ? "border-b-2 border-rasma-teal text-rasma-teal" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <User className="h-3.5 w-3.5 inline mr-1" />
                  Directos
                  {dmThreads.some((t) => t.unread) && (
                    <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-rasma-teal" />
                  )}
                </button>
              </div>
            ) : (
              <div className="border-b shrink-0 py-2 px-3 text-xs font-medium text-muted-foreground">
                <Users className="h-3.5 w-3.5 inline mr-1" />
                Equipo de Atención
              </div>
            )}

            {/* List content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : tab === "equipos" ? (
                teams.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <Users className="h-8 w-8 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      {isPatient ? "No tienes un equipo de atención asignado aún." : "No perteneces a ningun equipo de atencion aun."}
                    </p>
                    {!isPatient && (
                      <Button size="sm" variant="outline" onClick={() => setView({ type: "search" })} className="gap-1.5">
                        <Search className="h-3.5 w-3.5" /> Buscar paciente
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
                          className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/50 text-left transition-colors"
                        >
                          <AvatarInitials name={patientName} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{patientName}</p>
                            {team.lastMessage ? (
                              <p className="text-xs text-muted-foreground truncate">
                                {team.lastMessage.senderName}: {team.lastMessage.content}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Sin mensajes</p>
                            )}
                          </div>
                          {team.lastMessage && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
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
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <User className="h-8 w-8 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Sin conversaciones directas.
                    </p>
                    <Button size="sm" variant="outline" onClick={() => setView({ type: "search" })} className="gap-1.5">
                      <Search className="h-3.5 w-3.5" /> Buscar persona
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {dmThreads.map((thread) => (
                      <button
                        key={thread.partnerId}
                        onClick={() => setView({ type: "dm-chat", partnerId: thread.partnerId, partnerName: thread.partner.name })}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/50 text-left transition-colors"
                      >
                        {thread.partner.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thread.partner.image} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <AvatarInitials name={thread.partner.name} size="sm" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium truncate", thread.unread && "font-semibold")}>{thread.partner.name}</p>
                          <p className={cn("text-xs text-muted-foreground truncate", thread.unread && "text-foreground")}>
                            {thread.lastMessage.isFromMe ? "Tu: " : ""}{thread.lastMessage.content}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] text-muted-foreground">
                            {timeAgo(thread.lastMessage.createdAt)}
                          </span>
                          {thread.unread && <span className="h-2 w-2 rounded-full bg-rasma-teal" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          </>
        )}

        {/* Search view */}
        {view.type === "search" && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar persona o paciente..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-muted/50 rounded-lg outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-rasma-teal"
                  autoFocus
                />
                {searchLoading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
            </div>

            {searchQuery.trim().length < 2 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Escribe al menos 2 caracteres para buscar</p>
              </div>
            ) : (
              <div className="divide-y">
                {searchResults.staff.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-muted/30">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Personal</p>
                    </div>
                    {searchResults.staff.map((person) => (
                      <button
                        key={person.id}
                        onClick={() => setView({ type: "dm-chat", partnerId: person.id, partnerName: person.name })}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/50 text-left transition-colors"
                      >
                        {person.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={person.image} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <AvatarInitials name={person.name} size="sm" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{person.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {person.specialty || person.role}
                          </p>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {searchResults.patients.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-muted/30">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pacientes</p>
                    </div>
                    {searchResults.patients.map((patient) => (
                      <button
                        key={patient.id}
                        onClick={() => handleStartPatientChat(patient.id)}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/50 text-left transition-colors"
                      >
                        <AvatarInitials name={`${patient.firstName} ${patient.lastName}`} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{patient.firstName} {patient.lastName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {patient.rut || patient.email || ""}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {patient.status === "activo" ? "Activo" : patient.status === "inactivo" ? "Inactivo" : "Alta"}
                        </Badge>
                      </button>
                    ))}
                  </>
                )}

                {!searchLoading && searchResults.staff.length === 0 && searchResults.patients.length === 0 && (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">Sin resultados para &ldquo;{searchQuery}&rdquo;</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Message thread (care team or DM) */}
        {(view.type === "team-chat" || view.type === "dm-chat") && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {currentMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">Inicia la conversacion</p>
                </div>
              ) : (
                currentMessages.map((msg) => {
                  const isTemp = msg.id.startsWith("temp-");
                  return (
                    <div key={msg.id} className={cn("flex items-start gap-2", isTemp && "opacity-60")}>
                      {msg.sender.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={msg.sender.image}
                          alt={msg.sender.name}
                          className="h-7 w-7 rounded-full object-cover shrink-0 mt-0.5"
                        />
                      ) : (
                        <AvatarInitials name={msg.sender.name} size="sm" className="h-7 w-7 text-[10px] shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-medium">{msg.sender.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {isTemp ? "enviando..." : timeAgo(msg.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="border-t px-3 py-2 shrink-0">
              <div className="flex items-center gap-2">
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
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={handleSend}
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
