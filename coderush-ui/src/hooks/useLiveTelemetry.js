// Placeholder for splitting telemetry-specific concerns (e.g. reconnect
// backoff, latency measurement for the "efficiency" story) out of
// simulationStore.js once that file starts feeling crowded.
export function useLiveTelemetry() {
  // Intentionally empty for now — simulationStore.js owns the connection.
  // Promote logic here when a second component needs telemetry state
  // that isn't already in the main store.
}
