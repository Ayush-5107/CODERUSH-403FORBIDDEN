/**
 * Draws the path from result.routeCoordinates (see contract.js). Uses a
 * dashed stroke with an offset animation as a simple "traveling" effect —
 * swap for a real moving marker along the path if there's time.
 */
export default function RouteOverlay({ result }) {
  if (!result?.routeCoordinates?.length) return null

  const points = result.routeCoordinates.map(([lat, lng]) => `${lng * 4},${lat * 4}`).join(' ')

  return (
    <polyline
      points={points}
      fill="none"
      stroke={result.feasible ? '#22d3ee' : '#dc2626'}
      strokeWidth={2}
      strokeDasharray="6 4"
    />
  )
}
