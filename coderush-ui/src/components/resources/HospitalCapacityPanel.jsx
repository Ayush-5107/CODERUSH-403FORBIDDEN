import { useState } from 'react'

const HOSPITAL_CONTACTS = {
  hosp_01: { phone: '+91 98230 11223', address: 'Nashik Central District Rd, Nashik' },
  hosp_02: { phone: '+91 98230 44556', address: 'Highway Junction, Ghoti' },
  hosp_03: { phone: '+91 98230 77889', address: 'Main Road, Niphad' },
  hosp_04: { phone: '+91 98230 99001', address: 'Station Circle, Yeola' },
}

export default function HospitalCapacityPanel({ hospitals, medicineStock }) {
  const [selectedHospital, setSelectedHospital] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="rounded-xl border border-white/10 p-3 bg-zinc-950/60 backdrop-blur-md">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-white/90">Hospitals & Contacts</h2>
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="text-[10px] font-semibold text-blue-300 hover:text-white bg-blue-950/80 hover:bg-blue-900 border border-blue-500/30 px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1"
        >
          <span>{isExpanded ? 'Collapse' : 'Expand View'}</span>
          <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>

      <div className={`flex flex-col gap-2 transition-all ${isExpanded ? '' : 'max-h-36 overflow-hidden relative'}`}>
        {hospitals.map((h) => {
          const lowStock = medicineStock.filter((m) => m.hospitalId === h.id && m.unitsRemaining < 5)
          const contact = HOSPITAL_CONTACTS[h.id] || { phone: '+91 98230 00000', address: 'Regional Center' }

          return (
            <div key={h.id} className="text-xs border border-white/10 bg-white/5 rounded-lg p-2.5 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{h.name}</span>
                <span className="text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/20 text-[10px]">
                  {h.bedsAvailable} beds free
                </span>
              </div>
              <div className="text-white/50 text-[11px] capitalize">{h.specialties.join(', ')}</div>
              
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5">
                <span className="text-[10px] text-white/40 font-mono flex items-center gap-1">
                  <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  {contact.phone}
                </span>
                <button
                  onClick={() => setSelectedHospital({ ...h, ...contact })}
                  className="px-2 py-0.5 text-[10px] font-semibold text-blue-300 bg-blue-950/80 hover:bg-blue-900 border border-blue-500/30 rounded transition cursor-pointer"
                >
                  Contact & Confirm
                </button>
              </div>

              {lowStock.length > 0 && (
                <div className="text-amber-400 text-[10px] mt-0.5 flex items-center gap-1">
                  <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Low stock: {lowStock.map((m) => m.drug).join(', ')}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Hospital Contact Modal */}
      {selectedHospital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/15 rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4M9 7h6m-3-3v6" /></svg>
                Hospital Confirmation
              </h3>
              <button onClick={() => setSelectedHospital(null)} className="text-white/40 hover:text-white">✕</button>
            </div>
            
            <div className="flex flex-col gap-2 text-xs">
              <div className="font-bold text-base text-emerald-400">{selectedHospital.name}</div>
              <div className="text-white/70 flex items-center gap-1">📍 <span className="text-white/90">{selectedHospital.address}</span></div>
              <div className="text-white/70">Available Beds: <span className="font-bold text-white">{selectedHospital.bedsAvailable}</span></div>
              <div className="text-white/70">On-Duty Specialties: <span className="text-white/90 capitalize">{selectedHospital.specialties.join(', ')}</span></div>

              <div className="mt-3 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 flex flex-col items-center gap-2 text-center">
                <span className="text-xs text-emerald-300 font-medium">Direct Hotline Confirmation</span>
                <a
                  href={`tel:${selectedHospital.phone}`}
                  className="text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 w-full justify-center transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  Call {selectedHospital.phone}
                </a>
              </div>
            </div>

            <button
              onClick={() => setSelectedHospital(null)}
              className="mt-4 w-full py-1.5 rounded-lg bg-zinc-800 text-white/70 text-xs hover:text-white font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
