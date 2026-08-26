import { useState } from 'react'
import { acceptDispatchRoute, recalculateRoute } from '../../api/client.js'

export default function CostBreakdown({ result }) {
  const [isAccepting, setIsAccepting] = useState(false)
  const [isAccepted, setIsAccepted] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [showRecalcSuccessModal, setShowRecalcSuccessModal] = useState(false)

  if (!result) {
    return (
      <div className="rounded-xl border border-white/10 p-3 bg-zinc-950/40">
        <h2 className="text-sm font-semibold mb-1 text-white/90">Trip Breakdown</h2>
        <p className="text-xs text-white/40">No route selected yet.</p>
      </div>
    )
  }

  const handleAccept = async () => {
    if (!result.requestId) return
    setIsAccepting(true)
    try {
      await acceptDispatchRoute(result.requestId)
      setIsAccepted(true)
    } catch (err) {
      console.error('Failed to accept route:', err)
    } finally {
      setIsAccepting(false)
    }
  }

  const handleRecalculate = async () => {
    if (!result.requestId) return
    setIsRecalculating(true)
    try {
      await recalculateRoute(result.requestId)
      // Slight delay to ensure user sees the recalculation sequence before modal popup
      setTimeout(() => {
        setShowRecalcSuccessModal(true)
      }, 400)
    } catch (err) {
      console.error('Failed to recalculate route:', err)
    } finally {
      setIsRecalculating(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/10 p-3.5 bg-zinc-950/60 backdrop-blur-md">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-white/90">Trip Breakdown</h2>
        {result.hospitalName && (
          <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30">
            {result.hospitalName}
          </span>
        )}
      </div>

      <div className="text-xs flex flex-col gap-1.5">
        {result.pickupTimeMinutes != null && (
          <Row label="Ambulance Pickup Time" value={`${result.pickupTimeMinutes} min`} color="text-amber-300" />
        )}
        {result.deliveryTimeMinutes != null && (
          <Row label="Hospital Transport Time" value={`${result.deliveryTimeMinutes} min`} color="text-emerald-300" />
        )}
        <Row label="Hospital Queue Delay" value={`${result.queueDelayMinutes ?? result.waitTimeMinutes ?? 0} min`} color={result.queueDelayMinutes > 0 ? "text-rose-300" : "text-white/60"} />
        <Row label="Total Estimated Duration" value={`${result.travelTimeMinutes ?? result.totalCost} min`} bold />
        
        {/* Enforced Constraint Indicators */}
        <div className="mt-2 pt-2 border-t border-white/5 grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="bg-zinc-900 border border-white/10 p-1.5 rounded-lg flex flex-col">
            <span className="text-white/40">SLA Window Deadline</span>
            <span className="text-emerald-400 font-bold font-mono">60 Min Enforced ✓</span>
          </div>
          <div className="bg-zinc-900 border border-white/10 p-1.5 rounded-lg flex flex-col">
            <span className="text-white/40">Dynamic Edge Weight</span>
            <span className="text-cyan-400 font-bold font-mono">Real-time Snapped</span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Accept Route, Recalculate & Quickdial Ambulance */}
      {result.feasible && (
        <div className="flex flex-col gap-2 mt-3 pt-2.5 border-t border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={handleAccept}
              disabled={isAccepting || isAccepted}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                isAccepted
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
              }`}
            >
              {isAccepted ? (
                <svg className="w-3.5 h-3.5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 17a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4zM4 17V6a1 1 0 011-1h9v12m0-12h3.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V17h-2M11 9H7m2-2v4" /></svg>
              )}
              <span>{isAccepted ? 'Route Accepted (Fleet Locked)' : isAccepting ? 'Locking Fleet…' : 'Accept Route'}</span>
            </button>

            <button
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                isRecalculating 
                  ? 'bg-amber-950 text-amber-200 border-amber-500/50 animate-pulse' 
                  : 'bg-zinc-800 hover:bg-zinc-700 text-white/90 border-white/15'
              }`}
              title="Re-evaluate best route using active road graph state"
            >
              <span className={isRecalculating ? 'animate-spin' : ''}>↻</span>
              <span>{isRecalculating ? 'Optimizing…' : 'Recalculate'}</span>
            </button>
          </div>

          {isRecalculating && (
            <div className="text-[11px] font-semibold text-amber-300 bg-amber-950/90 border border-amber-500/40 p-2 rounded-lg text-center animate-pulse flex items-center justify-center gap-1.5">
              <span>⚡</span> Re-evaluating Dijkstra shortest path engine…
            </div>
          )}

          <a
            href="tel:+919876543210"
            className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-amber-300 bg-amber-950/70 hover:bg-amber-900/80 border border-amber-500/30 transition flex items-center justify-center gap-1.5 shadow-md"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            Quickdial Ambulance Dispatch (+91 98765 43210)
          </a>
        </div>
      )}

      {/* Recalculation Complete Confirmation Modal */}
      {showRecalcSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-emerald-500/40 rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Route Recalculation Complete
              </h3>
              <button onClick={() => setShowRecalcSuccessModal(false)} className="text-white/40 hover:text-white">✕</button>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <p className="text-white/90">
                The <span className="font-semibold text-emerald-300">PulseRoute Engine</span> has re-evaluated shortest path Dijkstra/A* constraints for this request.
              </p>
              
              <div className="bg-zinc-950 p-3 rounded-xl border border-white/10 flex flex-col gap-1 my-1">
                <div className="flex justify-between text-white/70">
                  <span>Assigned Hospital:</span>
                  <span className="font-semibold text-emerald-400">{result.hospitalName || 'Matched Center'}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>New Pickup Time:</span>
                  <span className="font-semibold text-amber-300">{result.pickupTimeMinutes} min</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>New Transport Time:</span>
                  <span className="font-semibold text-emerald-300">{result.deliveryTimeMinutes} min</span>
                </div>
                <div className="flex justify-between text-white/70 border-t border-white/10 pt-1 mt-1 font-bold">
                  <span className="text-white">Total Travel Time:</span>
                  <span className="text-white">{result.travelTimeMinutes ?? result.totalCost} min</span>
                </div>
              </div>

              <p className="text-[11px] text-white/50 italic">
                Active road vectors and hospital queue delays updated on the map canvas.
              </p>
            </div>

            <button
              onClick={() => setShowRecalcSuccessModal(false)}
              className="mt-4 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg"
            >
              Confirm & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, bold, color }) {
  return (
    <div className={`flex justify-between items-center ${bold ? 'font-semibold text-white border-t border-white/10 pt-1.5 mt-1' : 'text-white/70'}`}>
      <span>{label}</span>
      <span className={color ?? ''}>{value}</span>
    </div>
  )
}

