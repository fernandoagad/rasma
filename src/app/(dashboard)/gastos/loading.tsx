export default function GastosLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-24 bg-muted rounded-lg" />
          <div className="h-4 w-28 bg-muted rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-muted rounded-lg" />
          <div className="h-9 w-32 bg-muted rounded-lg" />
        </div>
      </div>

      {/* 2 stat cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border p-4">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-7 w-36 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
              <div className="h-10 w-10 bg-muted rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-4">
        <div className="h-9 w-40 bg-muted rounded-lg" />
        <div className="h-9 w-36 bg-muted rounded-lg" />
        <div className="h-9 w-36 bg-muted rounded-lg" />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border">
        <div className="border-b px-4 py-3 flex gap-6">
          <div className="h-3 w-8 bg-muted rounded" />
          <div className="h-3 w-32 bg-muted rounded" />
          <div className="h-3 w-20 bg-muted rounded" />
          <div className="h-3 w-24 bg-muted rounded" />
          <div className="h-3 w-20 bg-muted rounded" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b last:border-0 px-4 py-3.5 flex items-center gap-4">
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-48 bg-muted rounded" />
              <div className="h-2.5 w-24 bg-muted rounded" />
            </div>
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-3 w-24 bg-muted rounded" />
            <div className="h-5 w-20 bg-muted rounded-full" />
            <div className="h-7 w-7 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
