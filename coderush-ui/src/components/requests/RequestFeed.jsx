import { useState } from 'react'
import StatusBadge from '../shared/StatusBadge.jsx'
import { submitEmergencyRequest } from '../../api/client.js'

const urgencyColor = {
  critical: 'text-urgent font-bold',
  urgent: 'text-elevated font-semibold',
  elevated: 'text-elevated',
  routine: 'text-routine',
}

const VILLAGE_OPTIONS = [
  'Ghoti', 'Niphad', 'Yeola', 'Peth', 'Chandwad', 'Surgana', 'Kalwan', 'Trimbakeshwar'
]

const SPECIALTY_OPTIONS = [
  'cardiology', 'trauma', 'neurology', 'plastic_surgery', 'pediatrics', 'general_surgery'
]

const URGENCY_OPTIONS = [
  { label: 'Critical (Tier 1)', value: 'critical' },
  { label: 'Urgent (Tier 2)', value: 'urgent' },
  { label: 'Elevated (Tier 2)', value: 'elevated' },
  { label: 'Routine (Tier 3)', value: 'routine' },
]

export default function RequestFeed({ requests, selectedRequestId, onSelect }) {
  const [isOpen, setIsOpen] = useState(false)
  const [villageName, setVillageName] = useState(VILLAGE_OPTIONS[0])
  const [specialtyNeeded, setSpecialtyNeeded] = useState(SPECIALTY_OPTIONS[0])
  const [urgencyTier, setUrgencyTier] = useState(URGENCY_OPTIONS[0].value)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const created = await submitEmergencyRequest({
        villageName,
        specialtyNeeded,
        urgencyTier,
      })
      if (created && created.id) {
        onSelect(created.id)
      }
      setIsOpen(false)
    } catch (err) {
      console.error('Failed to create manual emergency request', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/10 p-3 bg-zinc-950/60 backdrop-blur-md">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-white/90">Emergency requests</h2>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600/90 text-white hover:bg-emerald-500 transition shadow-md active:scale-95 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Add Request
        </button>
      </div>

      <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-0.5">
        {requests.length === 0 && <p className="text-xs text-white/40">No requests yet.</p>}
        {requests.map((r) => (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={`text-left text-xs rounded-lg px-2.5 py-2 border transition ${
              selectedRequestId === r.id ? 'border-emerald-500/50 bg-emerald-950/30' : 'border-white/5 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white/90">{r.villageName}</span>
              <span className={urgencyColor[r.urgencyTier] || 'text-white/60'}>{r.urgencyTier}</span>
            </div>
            <div className="flex items-center justify-between text-white/50 mt-1">
              <span className="text-[11px] capitalize">{r.specialtyNeeded.replace('_', ' ')}</span>
              <StatusBadge status={r.status} />
            </div>
          </button>
        ))}
      </div>

      {/* Add Request Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/15 rounded-2xl p-5 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-rose-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Dispatch New Emergency Request
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-white/70 font-medium mb-1">Village Location</label>
                <select
                  value={villageName}
                  onChange={(e) => setVillageName(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  {VILLAGE_OPTIONS.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/70 font-medium mb-1">Required Specialty Doctor</label>
                <select
                  value={specialtyNeeded}
                  onChange={(e) => setSpecialtyNeeded(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 capitalize"
                >
                  {SPECIALTY_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/70 font-medium mb-1">Priority / Urgency Tier</label>
                <select
                  value={urgencyTier}
                  onChange={(e) => setUrgencyTier(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  {URGENCY_OPTIONS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-white/70 hover:text-white transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 font-bold transition shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
