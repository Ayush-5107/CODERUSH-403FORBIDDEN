import { useState } from 'react'
import { submitEmergencyRequest } from '../../api/client.js'

/**
 * Lets you (or a judge) trigger a real request during the live demo
 * instead of only watching a pre-scripted simulation — useful for proving
 * the algorithm runs live, not on canned data.
 */
export default function RequestForm() {
  const [villageName, setVillageName] = useState('')
  const [specialtyNeeded, setSpecialtyNeeded] = useState('cardiology')
  const [urgencyTier, setUrgencyTier] = useState('urgent')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await submitEmergencyRequest({ villageName, specialtyNeeded, urgencyTier })
      setVillageName('')
    } catch (err) {
      console.error('Failed to submit request', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 p-3 flex flex-col gap-2 bg-zinc-950/40">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Trigger test request</h2>
        <span className="text-[10px] text-white/40">Live dispatch</span>
      </div>

      {/* 1-Click Demo Scenario Button */}
      <button
        type="button"
        disabled={submitting}
        onClick={async () => {
          setSubmitting(true)
          try {
            await submitEmergencyRequest({
              villageName: 'Village A (Ghoti)',
              specialtyNeeded: 'cardiology',
              urgencyTier: 'urgent'
            })
          } catch (err) {
            console.error('Demo trigger failed', err)
          } finally {
            setSubmitting(false)
          }
        }}
        className="w-full text-xs font-semibold py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border border-amber-500/40 text-amber-200 hover:from-amber-500/30 hover:to-red-500/30 transition-all flex items-center justify-center gap-1.5 shadow-md"
      >
        <span>⚡</span>
        <span>Run Mock Demo (Cardiology Bypass)</span>
      </button>

      <div className="relative my-1 flex items-center justify-center">
        <div className="border-t border-white/10 w-full"></div>
        <span className="bg-zinc-950 px-2 text-[10px] text-white/30 uppercase tracking-wider absolute">or custom</span>
      </div>

      <input
        value={villageName}
        onChange={(e) => setVillageName(e.target.value)}
        placeholder="Village name (e.g. Niphad)"
        className="bg-black/30 border border-white/10 rounded-md px-2 py-1 text-xs text-white"
        required
      />
      <select
        value={specialtyNeeded}
        onChange={(e) => setSpecialtyNeeded(e.target.value)}
        className="bg-black/30 border border-white/10 rounded-md px-2 py-1 text-xs text-white"
      >
        <option value="cardiology">Cardiology</option>
        <option value="trauma">Trauma / Surgery</option>
        <option value="general">General Medicine</option>
      </select>
      <select
        value={urgencyTier}
        onChange={(e) => setUrgencyTier(e.target.value)}
        className="bg-black/30 border border-white/10 rounded-md px-2 py-1 text-xs text-white"
      >
        <option value="critical">Critical (Tier 1)</option>
        <option value="urgent">Urgent (Tier 2)</option>
        <option value="elevated">Elevated (Tier 2)</option>
        <option value="routine">Routine (Tier 3)</option>
      </select>
      <button
        type="submit"
        disabled={submitting}
        className="text-xs rounded-md bg-white/10 hover:bg-white/20 px-2 py-1.5 disabled:opacity-40 font-medium transition-colors"
      >
        {submitting ? 'Dispatching…' : 'Send Custom Request'}
      </button>
    </form>
  )
}
