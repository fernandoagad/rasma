export default function NotasLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-zinc-200" />
          <div><div className="h-7 w-40 bg-zinc-200 rounded" /><div className="h-4 w-32 bg-zinc-100 rounded mt-2" /></div>
        </div>
        <div className="h-11 w-32 bg-zinc-200 rounded-xl" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-zinc-200" />
            <div className="flex-1"><div className="h-4 w-32 bg-zinc-200 rounded" /><div className="h-3 w-48 bg-zinc-100 rounded mt-1.5" /></div>
            <div className="h-5 w-20 bg-zinc-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
