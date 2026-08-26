export default function Header({ connectionStatus }) {
  const statusColor =
    connectionStatus === 'live' ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse' : connectionStatus === 'connecting' ? 'bg-amber-400' : 'bg-rose-500'

  return (
    <header className="flex flex-col border-b border-white/10 bg-zinc-950/90 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-emerald-400 flex items-center justify-center text-white font-extrabold shadow-lg shadow-rose-950/50">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.684a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 12h2l1-3 2 6 1.5-3.5 1 1.5h2.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              PulseRoute
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 uppercase tracking-widest">
                Emergency Dispatch Engine
              </span>
            </h1>
            <p className="text-[11px] text-white/50">Real-time rural healthcare routing & multi-constraint allocation</p>
          </div>
        </div>

        {/* System Scale & Constraint Telemetry Ticker */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-white/80">
            <span className="text-emerald-400 font-bold">50,000+</span>
            <span className="text-white/50">Graph Nodes</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-white/80">
            <span className="text-cyan-400 font-bold">200,000+</span>
            <span className="text-white/50">Road Edges</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-white/80">
            <span className="text-amber-400 font-bold">5,000+</span>
            <span className="text-white/50">Villages</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-white/80">
            <span className="text-purple-400 font-bold">Dijkstra / A*</span>
            <span className="text-white/50">Engine</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-white/5 border border-white/10">
          <span className={`h-2 w-2 rounded-full ${statusColor}`} />
          <span className="capitalize text-white/80">{connectionStatus} Telemetry</span>
        </div>
      </div>
    </header>
  )
}
