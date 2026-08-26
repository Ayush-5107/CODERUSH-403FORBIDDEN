import { useState } from 'react'
import NetworkMap from '../map/NetworkMap.jsx'
import RequestFeed from '../requests/RequestFeed.jsx'
import AmbulanceFleetPanel from '../resources/AmbulanceFleetPanel.jsx'
import HospitalCapacityPanel from '../resources/HospitalCapacityPanel.jsx'
import DecisionLog from '../decision/DecisionLog.jsx'
import CostBreakdown from '../decision/CostBreakdown.jsx'

export default function Dashboard({ state, selectRequest, selectedResult }) {
  const [isMapMaximized, setIsMapMaximized] = useState(false)
  const selectedRequest = state.requests.find((r) => r.id === state.selectedRequestId) || null

  return (
    <div className={`p-4 h-[calc(100vh-64px)] transition-all duration-200 ${
      isMapMaximized 
        ? 'flex flex-col' 
        : 'grid grid-cols-[280px_1fr_320px] gap-4'
    }`}>
      {!isMapMaximized && (
        <div className="flex flex-col gap-4">
          <RequestFeed
            requests={state.requests}
            selectedRequestId={state.selectedRequestId}
            onSelect={selectRequest}
          />
          <AmbulanceFleetPanel ambulances={state.ambulances} />
        </div>
      )}

      <div className="flex flex-col flex-1 h-full min-h-0">
        <NetworkMap
          hospitals={state.hospitals}
          ambulances={state.ambulances}
          selectedResult={selectedResult}
          selectedRequest={selectedRequest}
          isMaximized={isMapMaximized}
          onToggleMaximize={() => setIsMapMaximized((prev) => !prev)}
        />
      </div>

      {!isMapMaximized && (
        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
          <HospitalCapacityPanel hospitals={state.hospitals} medicineStock={state.medicineStock} />
          <CostBreakdown result={selectedResult} />
          <DecisionLog result={selectedResult} />
        </div>
      )}
    </div>
  )
}
