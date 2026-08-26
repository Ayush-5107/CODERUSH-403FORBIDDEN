// Centralize lat/lng -> screen-space projection here once the map moves
// off the naive `lat * 4` placeholder scaling used in NetworkMap.jsx, so
// every marker and the route overlay stay in sync.

export function projectToScreen(lat, lng, scale = 4) {
  return { x: lng * scale, y: lat * scale }
}
