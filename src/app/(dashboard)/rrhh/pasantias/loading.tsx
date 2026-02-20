export default function PasantiasLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
        <div className="h-9 w-32 bg-muted rounded" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-40 bg-muted rounded" />
        <div className="h-9 w-48 bg-muted rounded" />
      </div>

      {/* Table skeleton */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/30 p-3 flex gap-4">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-4 w-28 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-3 border-t flex gap-4">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-4 w-36 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-4 w-28 bg-muted rounded" />
            <div className="h-5 w-16 bg-muted rounded-full" />
            <div className="h-4 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
