"use client";

import { useEffect, useState } from "react";
import { getOnlineUsers } from "@/actions/presence";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { MessageCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type OnlineUser = {
  id: string;
  name: string;
  image: string | null;
};

export function OnlineAvatars({ onChatOpen }: { onChatOpen?: () => void }) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const users = await getOnlineUsers();
      setOnlineUsers(users);
    };
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  if (onlineUsers.length === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onChatOpen}
            className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Chat del equipo</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onChatOpen}
          className="flex items-center -space-x-1.5 outline-none"
        >
          {onlineUsers.slice(0, 3).map((user) => (
            <div
              key={user.id}
              className="relative h-7 w-7 rounded-full ring-2 ring-background"
            >
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <AvatarInitials name={user.name} size="sm" className="h-7 w-7 text-[10px]" />
              )}
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 ring-1 ring-background" />
            </div>
          ))}
          {onlineUsers.length > 3 && (
            <div className="flex items-center justify-center h-7 w-7 rounded-full ring-2 ring-background bg-muted text-[10px] font-medium text-muted-foreground">
              +{onlineUsers.length - 3}
            </div>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {onlineUsers.map((u) => u.name).join(", ")} — en línea
      </TooltipContent>
    </Tooltip>
  );
}
