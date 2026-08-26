import { useReducer, useEffect, useMemo } from 'react'
import { connectSimulationSocket } from '../api/socket.js'
import { getResourceSnapshot } from '../api/client.js'

const initialState = {
  requests: [], // EmergencyRequestShape[]
  dispatchResults: {}, // requestId -> DispatchResultShape
  ambulances: [],
  hospitals: [],
  medicineStock: [],
  selectedRequestId: null,
  connectionStatus: 'connecting', // 'connecting' | 'live' | 'disconnected'
}

function reducer(state, action) {
  switch (action.type) {
    case 'SNAPSHOT_LOADED':
      return {
        ...state,
        ambulances: action.payload.ambulances,
        hospitals: action.payload.hospitals,
        medicineStock: action.payload.medicineStock,
      }
    case 'REQUEST_NEW':
      return { ...state, requests: [action.payload, ...state.requests] }
    case 'DISPATCH_RESULT':
      return {
        ...state,
        dispatchResults: { ...state.dispatchResults, [action.payload.requestId]: action.payload },
        requests: state.requests.map((r) =>
          r.id === action.payload.requestId ? { ...r, status: action.payload.feasible ? 'matched' : 'unfulfillable' } : r
        ),
      }
    case 'RESOURCES_UPDATE':
      return { ...state, ...action.payload }
    case 'SELECT_REQUEST':
      return { ...state, selectedRequestId: action.payload }
    case 'CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload }
    default:
      return state
  }
}

/**
 * One hook, mounted once near the top of the app (see App.jsx), that owns
 * the live connection and exposes state + a `select` action to every panel.
 * Nothing below the top level should open its own socket or poll its own
 * fetch — everyone reads from this store so the UI stays a true reflection
 * of one live backend state, not several out-of-sync copies of it.
 */
export function useSimulationStore() {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    getResourceSnapshot()
      .then((payload) => dispatch({ type: 'SNAPSHOT_LOADED', payload }))
      .catch((err) => console.error('Initial snapshot failed', err))

    const socket = connectSimulationSocket({
      'request:new': (payload) => dispatch({ type: 'REQUEST_NEW', payload }),
      'dispatch:result': (payload) => dispatch({ type: 'DISPATCH_RESULT', payload }),
      'resources:update': (payload) => dispatch({ type: 'RESOURCES_UPDATE', payload }),
      'connection:change': (isLive) => dispatch({ type: 'CONNECTION_STATUS', payload: isLive ? 'live' : 'disconnected' }),
    })


    return () => socket.close()
  }, [])

  const selectRequest = (id) => dispatch({ type: 'SELECT_REQUEST', payload: id })

  const selectedResult = useMemo(
    () => (state.selectedRequestId ? state.dispatchResults[state.selectedRequestId] : null),
    [state.selectedRequestId, state.dispatchResults]
  )

  return { state, selectRequest, selectedResult }
}
