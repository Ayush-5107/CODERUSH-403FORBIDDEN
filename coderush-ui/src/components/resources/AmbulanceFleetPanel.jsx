export default function AmbulanceFleetPanel({ ambulances }) {
  const available = ambulances.filter((a) => a.status === 'available').length

  return (
    <div className="rounded-xl border border-white/10 p-3 bg-zinc-950/60 backdrop-blur-md">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-white/90">Ambulance Fleet</h2>
        <span className="text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30">
          {available}/{ambulances.length} Active
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {ambulances.map((a) => (
          <span
            key={a.id}
            title={`${a.id} — Status: ${a.status}`}
            className={`h-3 w-3 rounded-full transition-all duration-200 cursor-pointer ${
              a.status === 'available'
                ? 'bg-emerald-400 shadow-sm shadow-emerald-400 hover:scale-125'
                : 'bg-amber-400 shadow-sm shadow-amber-400 animate-pulse hover:scale-125'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
