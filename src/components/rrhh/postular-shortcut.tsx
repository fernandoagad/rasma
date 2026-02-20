"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LinkIcon, Check, Copy } from "lucide-react";

export function PostularShortcut() {
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const postularUrl = `${baseUrl}/postular`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(postularUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <Card className="bg-rasma-teal/5 border-rasma-teal/20">
      <CardContent className="py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <LinkIcon className="h-4 w-4 text-rasma-teal shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-rasma-dark">Enlace de postulación</p>
              <p className="text-xs text-muted-foreground truncate">{postularUrl}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0 gap-1">
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copiar enlace
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
