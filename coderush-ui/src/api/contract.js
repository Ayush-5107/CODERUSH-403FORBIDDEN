/**
 * CONTRACT — agree on this shape with your teammate BEFORE either of you
 * writes real logic. The UI renders exactly these shapes; the algorithm
 * side needs to produce exactly these shapes. Changing a field name here
 * means changing it in both places.
 *
 * Nothing in this file is UI logic — it's just documentation-as-code so
 * the two of you don't drift out of sync while working in parallel.
 */

// POST /requests  or  emitted over the WebSocket as "request:new"
export const EmergencyRequestShape = {
  id: 'req_123',
  villageId: 'village_042',
  villageName: 'Village A',
  lat: 19.07,
  lng: 72.87,
  specialtyNeeded: 'cardiology',
  urgencyTier: 'critical', // 'critical' | 'urgent' | 'elevated' | 'routine'
  slaDeadline: '2026-08-26T10:15:00Z',
  status: 'pending', // 'pending' | 'matched' | 'en_route' | 'fulfilled' | 'unfulfillable'
  createdAt: '2026-08-26T10:00:00Z',
}

// Emitted as "dispatch:result" once the algorithm decides on a request
export const DispatchResultShape = {
  requestId: 'req_123',
  ambulanceId: 'amb_07',
  hospitalId: 'hosp_03',
  hospitalName: 'Hospital C',
  routeNodeIds: ['n1', 'n2', 'n3'], // ordered path through the graph, for map animation
  routeCoordinates: [[19.07, 72.87], [19.1, 72.9]], // [lat, lng] pairs, for drawing without needing full node lookup
  travelTimeMinutes: 38,
  waitTimeMinutes: 6,
  totalCost: 44,
  decisionLog: [
    // human-readable reasoning trail — this is what DecisionLog.jsx renders directly
    'Hospital B (10km) rejected: no on-duty cardiologist',
    'Hospital C (25km) selected: specialist available, cost 44 within SLA',
  ],
  feasible: true, // false when the request maps to a fallback / unfulfillable case
  fallbackReason: null, // e.g. 'no_route', 'all_ambulances_occupied', 'bed_full' — set only when feasible is false
}

// GET /resources/snapshot  or  emitted as "resources:update"
export const ResourceSnapshotShape = {
  ambulances: [
    { id: 'amb_07', status: 'available', lat: 19.05, lng: 72.86 }, // status: 'available' | 'en_route' | 'occupied'
  ],
  hospitals: [
    {
      id: 'hosp_03',
      name: 'Hospital C',
      lat: 19.1,
      lng: 72.9,
      specialties: ['cardiology', 'trauma'],
      bedsAvailable: 4,
    },
  ],
  medicineStock: [
    { hospitalId: 'hosp_03', drug: 'epinephrine', unitsRemaining: 12 },
  ],
}

// Emitted as "edge:closed" / "edge:reopened" when the algorithm side simulates a road closure
export const RoadEventShape = {
  edgeId: 'e_4821',
  fromNodeId: 'n1',
  toNodeId: 'n2',
  event: 'closed', // 'closed' | 'reopened'
  timestamp: '2026-08-26T10:03:00Z',
}
