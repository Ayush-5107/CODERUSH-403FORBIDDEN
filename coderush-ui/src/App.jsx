import Header from './components/layout/Header.jsx'
import Dashboard from './components/layout/Dashboard.jsx'
import { useSimulationStore } from './state/simulationStore.js'

export default function App() {
  const { state, selectRequest, selectedResult } = useSimulationStore()

  return (
    <div className="min-h-screen">
      <Header connectionStatus={state.connectionStatus} />
      <Dashboard state={state} selectRequest={selectRequest} selectedResult={selectedResult} />
    </div>
  )
}
