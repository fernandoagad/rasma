"use client";

import { useEffect, useState } from "react";
import { getOnlineUsers } from "@/actions/presence";
import { AvatarInitials } from "@/components/ui/avatar-initials";
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
    const fetch = async () => {
      const users = await getOnlineUsers();
      setOnlineUsers(users);
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  if (onlineUsers.length === 0) return null;

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
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {onlineUsers.map((u) => u.name).join(", ")} — en línea
      </TooltipContent>
    </Tooltip>
  );
}
