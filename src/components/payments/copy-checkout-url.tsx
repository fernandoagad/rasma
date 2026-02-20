"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function CopyCheckoutUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {copied ? "Enlace copiado" : "Copiar enlace de pago"}
      </TooltipContent>
    </Tooltip>
  );
}
