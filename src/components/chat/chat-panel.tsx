"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Send, ArrowLeft, MessageSquare } from "lucide-react";
import { getMyTeams, getCareTeamMessages, sendCareTeamMessage } from "@/actions/care-teams";
import { cn } from "@/lib/utils";

type Team = Awaited<ReturnType<typeof getMyTeams>>[number];
type Message = Awaited<ReturnType<typeof getCareTeamMessages>>[number];

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "ahora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function ChatPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, startSending] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load teams when panel opens
  useEffect(() => {
    if (open) {
      getMyTeams().then(setTeams);
    }
  }, [open]);

  // Load messages when a team is selected
  useEffect(() => {
    if (selectedPatientId) {
      getCareTeamMessages(selectedPatientId).then((msgs) => {
        setMessages(msgs.reverse()); // oldest first
      });
    }
  }, [selectedPatientId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages
  useEffect(() => {
    if (!selectedPatientId) return;
    const interval = setInterval(async () => {
      const msgs = await getCareTeamMessages(selectedPatientId);
      setMessages(msgs.reverse());
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedPatientId]);

  const handleSend = () => {
    if (!selectedPatientId || !newMessage.trim()) return;
    startSending(async () => {
      const result = await sendCareTeamMessage(selectedPatientId, newMessage);
      if (result.success) {
        setNewMessage("");
        // Refresh messages
        const msgs = await getCareTeamMessages(selectedPatientId);
        setMessages(msgs.reverse());
      }
    });
  };

  const selectedTeam = teams.find((t) => t.patientId === selectedPatientId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-96 p-0 flex flex-col">
        <SheetTitle className="flex items-center gap-3 h-12 px-4 border-b shrink-0">
          {selectedPatientId ? (
            <>
              <button onClick={() => setSelectedPatientId(null)} className="hover:bg-muted rounded p-1">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold text-sm truncate">
                {selectedTeam?.patient.firstName} {selectedTeam?.patient.lastName}
              </span>
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4" />
              <span className="font-semibold text-sm">Mensajes del Equipo</span>
            </>
          )}
        </SheetTitle>

        {!selectedPatientId ? (
          // Team list
          <div className="flex-1 overflow-y-auto">
            {teams.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No perteneces a ningún equipo de atención aún.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {teams.map((team) => {
                  const patientName = `${team.patient.firstName} ${team.patient.lastName}`;
                  return (
                    <button
                      key={team.patientId}
                      onClick={() => setSelectedPatientId(team.patientId)}
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
            )}
          </div>
        ) : (
          // Message thread
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">Inicia la conversación</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-2">
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
                          {timeAgo(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="border-t px-3 py-2 shrink-0">
              <div className="flex items-center gap-2">
                <input
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
                  disabled={sending}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
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
