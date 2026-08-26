export function useSelectedRequest(state, selectedResult) {
  const request = state.requests.find((r) => r.id === state.selectedRequestId) || null
  return { request, result: selectedResult }
}
