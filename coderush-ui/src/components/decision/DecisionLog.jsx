/**
 * This panel only ever displays `result.decisionLog` — strings produced
 * by the algorithm side (see DispatchResultShape in contract.js). Don't
 * write UI-side explanations here; if the reasoning shown isn't literally
 * what the algorithm returned, it stops being a real decision log.
 */
export default function DecisionLog({ result }) {
  return (
    <div className="rounded-xl border border-white/10 p-3 bg-zinc-950/60 backdrop-blur-md flex flex-col">
      <h2 className="text-sm font-semibold mb-2 text-white/90">Decision Log</h2>
      {!result && <p className="text-xs text-white/40">Select a request to see why it was routed.</p>}
      {result && (
        <div>
          <ol className="text-[11.5px] text-white/90 flex flex-col gap-2 font-mono tracking-tight leading-relaxed">
            {result.decisionLog.map((line, i) => {
              const isRejected = line.startsWith('[REJECTED]') || line.includes('REJECTED:')
              const isApproved = line.startsWith('[APPROVED]')
              return (
                <li
                  key={i}
                  className={
                    isRejected
                      ? 'text-rose-200/90 bg-rose-950/40 p-2.5 rounded-lg border border-rose-500/25 list-inside'
                      : isApproved
                      ? 'text-emerald-200/90 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-500/25 list-inside'
                      : 'text-white/70 p-1.5'
                  }
                >
                  {line}
                </li>
              )
            })}
            {!result.feasible && (
              <li className="text-rose-300 font-semibold mt-1 p-2 rounded-lg bg-rose-950/60 border border-rose-500/40 list-inside">
                UNFULFILLABLE: All candidate hospitals were rejected.
              </li>
            )}
          </ol>
        </div>
      )}
    </div>
  )
}
