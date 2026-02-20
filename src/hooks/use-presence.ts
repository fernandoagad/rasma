"use client";

import { useEffect } from "react";
import { heartbeat } from "@/actions/presence";

export function usePresence() {
  useEffect(() => {
    // Initial heartbeat
    heartbeat().catch(() => {});

    // Heartbeat every 30 seconds
    const interval = setInterval(() => {
      heartbeat().catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);
}
