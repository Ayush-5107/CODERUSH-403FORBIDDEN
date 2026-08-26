const BASE_URL = import.meta.env.VITE_API_URL || 'https://coderush-403forbidden.onrender.com'


async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`API error ${res.status} on ${path}`)
  }
  return res.json()
}

// Matches ResourceSnapshotShape in contract.js
export function getResourceSnapshot() {
  return request('/resources/snapshot')
}

// Body matches a subset of EmergencyRequestShape (id/status/createdAt are server-assigned)
export function submitEmergencyRequest(payload) {
  return request('/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// Returns DispatchResultShape for a request that's already been resolved
export function getDispatchResult(requestId) {
  return request(`/requests/${requestId}/result`)
}

export function recalculateRoute(requestId) {
  return request(`/requests/${requestId}/recalculate`, { method: 'POST' })
}

export function acceptDispatchRoute(requestId) {
  return request(`/requests/${requestId}/accept`, { method: 'POST' })
}
