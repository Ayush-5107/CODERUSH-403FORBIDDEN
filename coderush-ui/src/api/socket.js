const WS_URL = import.meta.env.VITE_WS_URL || 'wss://coderush-403forbidden.onrender.com/ws'


/**
 * Opens one shared WebSocket and fans out events by "type" to whichever
 * handler was registered for it. Expected server messages:
 *   { type: 'request:new',      payload: EmergencyRequestShape }
 *   { type: 'dispatch:result',  payload: DispatchResultShape }
 *   { type: 'resources:update', payload: ResourceSnapshotShape }
 *   { type: 'edge:closed' | 'edge:reopened', payload: RoadEventShape }
 *
 * Usage:
 *   const socket = connectSimulationSocket({
 *     'request:new': (req) => ...,
 *     'dispatch:result': (result) => ...,
 *   })
 *   socket.close() // on unmount
 */
export function connectSimulationSocket(handlers) {
  let ws = null
  let isClosedByClient = false
  let timerId = null

  function connect() {
    ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      console.log('Connected to simulation telemetry server')
      if (handlers['connection:change']) handlers['connection:change'](true)
    }

    ws.onmessage = (event) => {
      let msg
      try {
        msg = JSON.parse(event.data)
      } catch {
        console.error('Malformed WS message', event.data)
        return
      }
      const handler = handlers[msg.type]
      if (handler) handler(msg.payload)
    }

    ws.onerror = (err) => {
      console.error('WebSocket error', err)
      if (handlers['connection:change']) handlers['connection:change'](false)
    }

    ws.onclose = () => {
      if (handlers['connection:change']) handlers['connection:change'](false)
      if (!isClosedByClient) {
        console.warn('WebSocket closed, attempting reconnect in 3s...')
        timerId = setTimeout(connect, 3000)
      }
    }
  }

  connect()

  return {
    close() {
      isClosedByClient = true
      if (timerId) clearTimeout(timerId)
      if (ws) ws.close()
    }
  }
}

