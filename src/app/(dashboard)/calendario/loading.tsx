export default function CalendarioLoading() {
  return (
    <div className="space-y-5 max-w-[1440px] mx-auto animate-pulse">
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-zinc-200" />
          <div><div className="h-7 w-36 bg-zinc-200 rounded" /><div className="h-4 w-28 bg-zinc-100 rounded mt-2" /></div>
        </div>
        <div className="h-11 w-32 bg-zinc-200 rounded-xl" />
      </div>
      <div className="h-12 rounded-2xl bg-zinc-100 border" />
      <div className="rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-8 border-b bg-zinc-50/50">
          <div className="p-3" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="p-3 border-l"><div className="h-3 w-8 bg-zinc-200 rounded mx-auto" /><div className="h-5 w-6 bg-zinc-200 rounded mx-auto mt-1" /></div>
          ))}
        </div>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="grid grid-cols-8 min-h-[50px]">
            <div className="p-2 border-r"><div className="h-3 w-10 bg-zinc-100 rounded ml-auto" /></div>
            {Array.from({ length: 7 }).map((_, j) => (
              <div key={j} className="border-l border-b p-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
