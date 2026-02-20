export default function FinanzasLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-muted rounded-lg" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-32 bg-muted rounded-lg" />
          <div className="h-9 w-32 bg-muted rounded-lg" />
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-3">
        <div className="h-9 w-64 bg-muted rounded-lg" />
        <div className="h-9 w-20 bg-muted rounded-lg" />
        <div className="h-9 w-28 bg-muted rounded-lg" />
      </div>

      {/* 4 stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-6 w-28 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
              <div className="h-9 w-9 bg-muted rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border p-4">
            <div className="h-4 w-40 bg-muted rounded mb-4" />
            <div className="h-[240px] bg-muted rounded-lg" />
          </div>
        ))}
      </div>

      {/* Monthly trend chart */}
      <div className="bg-card rounded-xl border p-4">
        <div className="h-4 w-40 bg-muted rounded mb-4" />
        <div className="h-[280px] bg-muted rounded-lg" />
      </div>

      {/* Bottom cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border p-4 space-y-3">
            <div className="h-4 w-36 bg-muted rounded" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
              <div className="h-3 w-3/4 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
