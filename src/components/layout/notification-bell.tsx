"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Calendar, MessageSquare, CreditCard, Info } from "lucide-react";
import { getUnreadCount, getNotifications, markAsRead, markAllAsRead } from "@/actions/in-app-notifications";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, typeof Bell> = {
  appointment_reminder: Calendar,
  new_message: MessageSquare,
  payment_due: CreditCard,
  status_change: Info,
  system: Bell,
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "ahora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Awaited<ReturnType<typeof getNotifications>>>([]);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  // Poll for unread count
  useEffect(() => {
    const fetchCount = async () => {
      const count = await getUnreadCount();
      setUnreadCount(count);
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (open) {
      getNotifications(20).then(setNotifications);
    }
  }, [open]);

  const handleClick = (notif: (typeof notifications)[0]) => {
    if (!notif.read) {
      startTransition(async () => {
        await markAsRead(notif.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      });
    }
    if (notif.link) {
      router.push(notif.link);
      setOpen(false);
    }
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rasma-red px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Notificaciones</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-rasma-teal hover:underline"
            >
              Marcar todo como leído
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Sin notificaciones
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notif) => {
              const Icon = typeIcons[notif.type] || Bell;
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={cn(
                    "flex items-start gap-3 w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                    !notif.read && "bg-rasma-teal/5"
                  )}
                >
                  <div className="mt-0.5 h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm", !notif.read && "font-medium")}>
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="text-xs text-muted-foreground truncate">{notif.body}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {timeAgo(notif.createdAt)}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="mt-2 h-2 w-2 rounded-full bg-rasma-teal shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
