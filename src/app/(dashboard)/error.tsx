"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 max-w-md">
        <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-rasma-dark">Error al cargar la página</h2>
        <p className="text-sm text-muted-foreground">{error.message || "Ocurrió un error inesperado."}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-rasma-dark text-rasma-lime rounded-lg text-sm font-medium hover:opacity-90"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
