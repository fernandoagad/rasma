export default function DocumentosLoading() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-7 w-64 bg-muted rounded" />
        <div className="h-4 w-96 bg-muted rounded" />
      </div>

      {/* Upload zone */}
      <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 p-6">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-40 bg-muted rounded" />
            <div className="h-8 w-32 bg-muted rounded" />
          </div>
        </div>
      </div>

      {/* Search & filter bar */}
      <div className="flex gap-2">
        <div className="h-9 flex-1 bg-muted rounded" />
        <div className="h-9 w-[180px] bg-muted rounded" />
      </div>

      {/* File list skeleton */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/30 px-4 py-2">
          <div className="h-4 w-36 bg-muted rounded" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-t">
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="h-9 w-9 bg-muted rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-48 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded-full" />
              </div>
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
            <div className="h-8 w-8 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
