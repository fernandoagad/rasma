export default function PatientDetailLoading() {
  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-pulse">
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-zinc-200" />
          <div><div className="h-6 w-40 bg-zinc-200 rounded" /><div className="flex gap-2 mt-2"><div className="h-5 w-16 bg-zinc-200 rounded-full" /><div className="h-5 w-24 bg-zinc-100 rounded" /></div></div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border p-4">
            <div className="flex justify-between mb-3"><div className="h-3 w-20 bg-zinc-200 rounded" /><div className="h-8 w-8 rounded-xl bg-zinc-200" /></div>
            <div className="h-7 w-12 bg-zinc-200 rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border bg-white p-4"><div className="flex gap-4">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-3 w-20 bg-zinc-200 rounded" />))}</div></div>
      <div className="h-10 w-full bg-zinc-100 rounded-xl" />
      <div className="rounded-2xl border p-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2"><div className="h-9 w-9 rounded-xl bg-zinc-200" /><div className="flex-1"><div className="h-4 w-32 bg-zinc-200 rounded" /><div className="h-3 w-48 bg-zinc-100 rounded mt-1" /></div></div>
        ))}
      </div>
    </div>
  );
}
