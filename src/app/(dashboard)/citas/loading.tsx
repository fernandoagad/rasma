export default function CitasLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-zinc-200" />
          <div><div className="h-7 w-28 bg-zinc-200 rounded" /><div className="h-4 w-36 bg-zinc-100 rounded mt-2" /></div>
        </div>
        <div className="h-11 w-32 bg-zinc-200 rounded-xl" />
      </div>
      <div className="h-14 rounded-2xl bg-zinc-100 border" />
      <div className="space-y-2">
        <div className="h-4 w-48 bg-zinc-200 rounded mb-3" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border overflow-hidden flex">
            <div className="w-[100px] bg-zinc-100 py-6 border-r" />
            <div className="flex-1 p-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-zinc-200" />
              <div className="flex-1"><div className="h-4 w-28 bg-zinc-200 rounded" /><div className="h-3 w-40 bg-zinc-100 rounded mt-1.5" /></div>
              <div className="h-5 w-20 bg-zinc-200 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
