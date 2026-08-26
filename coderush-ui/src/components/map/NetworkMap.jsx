import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// ---------------------------------------------------------------------------
// Map style — CARTO dark raster tiles, no API key needed
// ---------------------------------------------------------------------------
const MAP_STYLE = {
    version: 8,
    sources: {
        'carto-dark': {
            type: 'raster',
            tiles: [
                'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 512,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        },
    },
    layers: [{ id: 'carto-tiles', type: 'raster', source: 'carto-dark' }],
}

const COLOR_PICKUP = '#F59E0B'    // Amber glow — Ambulance → Patient leg
const COLOR_DELIVERY = '#10B981'  // Emerald green glow — Patient → Hospital leg
const COLOR_FALLBACK = '#3B82F6'  // Electric Blue — fallback route

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createMarkerElement(type, label, extra = '') {
    const el = document.createElement('div')
    el.className = 'group relative cursor-pointer w-0 h-0 flex items-center justify-center overflow-visible'

    if (type === 'hospital') {
        el.innerHTML = `
            <div class="absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
                <div class="h-7 w-7 rounded-full bg-emerald-950/90 border border-emerald-400/90 shadow-lg shadow-emerald-950/60 flex items-center justify-center transition-transform duration-200 group-hover:scale-125">
                    <svg class="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4M9 7h6m-3-3v6" />
                    </svg>
                </div>
                <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center bg-zinc-950/95 text-emerald-200 border border-emerald-500/30 text-[10px] px-2.5 py-1 rounded-md shadow-2xl whitespace-nowrap z-30 pointer-events-none">
                    <span class="font-semibold">${label}</span>
                    ${extra ? `<span class="text-[9px] text-emerald-400/80">${extra}</span>` : ''}
                </div>
            </div>
        `
    } else if (type === 'ambulance') {
        const isBusy = extra === 'en_route'
        const borderCls = isBusy ? 'border-amber-400 bg-amber-950/90' : 'border-blue-400 bg-blue-950/90'
        const iconColor = isBusy ? 'text-amber-300' : 'text-blue-300'

        el.innerHTML = `
            <div class="absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
                ${isBusy ? '<span class="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-amber-400/40 opacity-75"></span>' : ''}
                <div class="h-6.5 w-6.5 rounded-full ${borderCls} border shadow-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-125">
                    <svg class="w-3.5 h-3.5 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 17a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4zM4 17V6a1 1 0 011-1h9v12m0-12h3.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V17h-2M11 9H7m2-2v4" />
                    </svg>
                </div>
                <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center bg-zinc-950/95 text-blue-200 border border-blue-500/30 text-[10px] px-2.5 py-1 rounded-md shadow-2xl whitespace-nowrap z-30 pointer-events-none">
                    <span class="font-semibold">${label}</span>
                </div>
            </div>
        `
    } else if (type === 'patient') {
        el.innerHTML = `
            <div class="absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
                <span class="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-rose-500/40 opacity-75"></span>
                <div class="relative h-6.5 w-6.5 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-125">
                    <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center bg-rose-950/95 text-rose-200 border border-rose-500/40 text-[10px] px-2.5 py-1 rounded-md shadow-2xl whitespace-nowrap z-30 pointer-events-none">
                    <span class="font-semibold">${label || 'Emergency Patient'}</span>
                </div>
            </div>
        `
    }
    return el
}

function centerOf(points) {
    const lats = points.map(p => p.lat ?? p[1])
    const lngs = points.map(p => p.lng ?? p[0])
    return {
        lat: (Math.min(...lats) + Math.max(...lats)) / 2,
        lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    }
}

function bbox(coordArrays) {
    const all = coordArrays.flat()
    if (!all.length) return null
    const lngs = all.map(c => Array.isArray(c) ? c[0] : c.lng)
    const lats = all.map(c => Array.isArray(c) ? c[1] : c.lat)
    return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]]
}

// Generate smooth curved route if OSRM is unavailable or sparse
function generateSmoothCurve(coords, numPoints = 35) {
    if (!coords || coords.length < 2) return coords ?? []
    if (coords.length > 2) return coords // Already detailed path

    const [start, end] = coords
    const [x1, y1] = start
    const [x2, y2] = end

    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    const dx = x2 - x1
    const dy = y2 - y1

    // Perpendicular curvature offset
    const curvature = 0.15
    const ctrlX = midX - dy * curvature
    const ctrlY = midY + dx * curvature

    const points = []
    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints
        const invT = 1 - t
        const x = invT * invT * x1 + 2 * invT * t * ctrlX + t * t * x2
        const y = invT * invT * y1 + 2 * invT * t * ctrlY + t * t * y2
        points.push([x, y])
    }
    return points
}

// Fetch real road route from OSRM (free driving routing API)
async function fetchRoadRoute(coords) {
    if (!coords || coords.length < 2) return []
    const waypoints = coords.map(([lng, lat]) => `${lng},${lat}`).join(';')
    const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson&steps=true`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`OSRM error ${res.status}`)
    const data = await res.json()
    if (!data.routes?.length) throw new Error('No route found')
    return data.routes[0].geometry.coordinates // [[lng,lat], ...]
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function NetworkMap({ hospitals = [], ambulances = [], selectedResult, selectedRequest, isMaximized, onToggleMaximize }) {
    const mapContainer = useRef(null)
    const mapRef = useRef(null)
    const markersRef = useRef([])
    const animFrameRef = useRef(null)
    const [mapInstance, setMapInstance] = useState(null)
    const [showTelemetry, setShowTelemetry] = useState(false)

    // Helper to focus camera directly on active route
    const handleFocusRoute = () => {
        const map = mapRef.current
        if (!map) return
        if (displayPickupCoords.length > 0 || displayDeliveryCoords.length > 0) {
            const bb = bbox(hasGraphRoute ? [displayPickupCoords, displayDeliveryCoords] : [straightLine])
            if (bb) {
                map.fitBounds(bb, { padding: 80, maxZoom: 12, duration: 900 })
                return
            }
        }
        const pts = [...hospitals, ...ambulances].filter(r => r.lat != null)
        if (pts.length) {
            const c = centerOf(pts)
            map.flyTo({ center: [c.lng, c.lat], zoom: 11, speed: 0.8 })
        }
    }

    // Derive route coordinates from dispatch plan
    const pickupCoords = useMemo(() => selectedResult?.pickupRoute ?? [], [selectedResult])
    const deliveryCoords = useMemo(() => selectedResult?.deliveryRoute ?? [], [selectedResult])

    const [realPickupCoords, setRealPickupCoords] = useState([])
    const [realDeliveryCoords, setRealDeliveryCoords] = useState([])
    const [isSnapping, setIsSnapping] = useState(false)

    // Patient location coordinates
    const patientPoint = useMemo(() => {
        if (selectedRequest?.lat != null && selectedRequest?.lng != null) {
            return [selectedRequest.lng, selectedRequest.lat]
        }
        if (selectedResult?.route?.patientLat != null && selectedResult?.route?.patientLng != null) {
            return [selectedResult.route.patientLng, selectedResult.route.patientLat]
        }
        if (pickupCoords.length > 0) {
            return pickupCoords[pickupCoords.length - 1]
        }
        return null
    }, [selectedRequest, selectedResult, pickupCoords])

    // Fetch road routes via OSRM
    useEffect(() => {
        if (pickupCoords.length < 2) {
            setRealPickupCoords([])
            return
        }
        let cancelled = false
        setIsSnapping(true)
        fetchRoadRoute(pickupCoords)
            .then(coords => {
                if (!cancelled) setRealPickupCoords(coords)
            })
            .catch(err => {
                console.warn('[OSRM] pickup route snap fallback:', err.message)
                if (!cancelled) setRealPickupCoords(generateSmoothCurve(pickupCoords))
            })
            .finally(() => {
                if (!cancelled) setIsSnapping(false)
            })
        return () => { cancelled = true }
    }, [pickupCoords])

    useEffect(() => {
        if (deliveryCoords.length < 2) {
            setRealDeliveryCoords([])
            return
        }
        let cancelled = false
        setIsSnapping(true)
        fetchRoadRoute(deliveryCoords)
            .then(coords => {
                if (!cancelled) setRealDeliveryCoords(coords)
            })
            .catch(err => {
                console.warn('[OSRM] delivery route snap fallback:', err.message)
                if (!cancelled) setRealDeliveryCoords(generateSmoothCurve(deliveryCoords))
            })
            .finally(() => {
                if (!cancelled) setIsSnapping(false)
            })
        return () => { cancelled = true }
    }, [deliveryCoords])

    // Fallback route when graph route isn't available
    const straightLine = useMemo(() => {
        if (pickupCoords.length >= 2 || deliveryCoords.length >= 2) return []
        if (!selectedResult?.route) return []
        const { ambulanceId, patientLat, patientLng, hospitalId } = selectedResult.route
        const ambo = ambulances.find(a => a.id === ambulanceId)
        const hosp = hospitals.find(h => h.id === hospitalId)
        if (!ambo || !hosp || patientLat == null) return []
        const rawLine = [[ambo.lng, ambo.lat], [patientLng, patientLat], [hosp.lng, hosp.lat]]
        return generateSmoothCurve(rawLine)
    }, [selectedResult, ambulances, hospitals, pickupCoords, deliveryCoords])

    const hasGraphRoute = pickupCoords.length >= 2 || deliveryCoords.length >= 2
    const routeStatus = !selectedResult ? 'idle'
        : isSnapping ? 'snapping'
            : hasGraphRoute ? 'done'
                : straightLine.length >= 2 ? 'fallback'
                    : 'idle'

    // Final rendered coordinates: Use graph route immediately, and update with snapped road route when ready
    const displayPickupCoords = realPickupCoords.length >= 2 ? realPickupCoords : (pickupCoords.length >= 2 ? pickupCoords : generateSmoothCurve(pickupCoords))
    const displayDeliveryCoords = realDeliveryCoords.length >= 2 ? realDeliveryCoords : (deliveryCoords.length >= 2 ? deliveryCoords : generateSmoothCurve(deliveryCoords))


    // Initialise MapLibre
    useEffect(() => {
        if (mapRef.current || !mapContainer.current) return

        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: MAP_STYLE,
            center: [73.79, 19.99],
            zoom: 10,
            attributionControl: false,
        })

        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
        map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

        mapRef.current = map

        map.on('load', () => {
            // Add Native Vector GeoJSON Sources & Layers for high-fidelity rendering
            map.addSource('pickup-route', {
                type: 'geojson',
                data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
            })
            map.addSource('delivery-route', {
                type: 'geojson',
                data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
            })
            map.addSource('fallback-route', {
                type: 'geojson',
                data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
            })

            // 1. Delivery Layers (Patient -> Hospital): Rendered first (bottom layer)
            map.addLayer({
                id: 'delivery-glow',
                type: 'line',
                source: 'delivery-route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': COLOR_DELIVERY,
                    'line-width': 12,
                    'line-opacity': 0.3,
                    'line-blur': 6,
                }
            })
            map.addLayer({
                id: 'delivery-casing',
                type: 'line',
                source: 'delivery-route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': '#064E3B',
                    'line-width': 6,
                    'line-opacity': 0.85,
                }
            })
            map.addLayer({
                id: 'delivery-line',
                type: 'line',
                source: 'delivery-route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': COLOR_DELIVERY,
                    'line-width': 3.5,
                }
            })

            // 2. Pickup Layers (Ambulance -> Patient): Rendered on top with bright amber glow
            map.addLayer({
                id: 'pickup-glow',
                type: 'line',
                source: 'pickup-route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': COLOR_PICKUP,
                    'line-width': 10,
                    'line-opacity': 0.45,
                    'line-blur': 4,
                }
            })
            map.addLayer({
                id: 'pickup-casing',
                type: 'line',
                source: 'pickup-route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': '#78350F',
                    'line-width': 5,
                    'line-opacity': 0.9,
                }
            })
            map.addLayer({
                id: 'pickup-line',
                type: 'line',
                source: 'pickup-route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': COLOR_PICKUP,
                    'line-width': 3.5,
                }
            })


            // Fallback Layer
            map.addLayer({
                id: 'fallback-line',
                type: 'line',
                source: 'fallback-route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': COLOR_FALLBACK,
                    'line-width': 3,
                    'line-dasharray': [4, 4],
                    'line-opacity': 0.8,
                }
            })

            setMapInstance(map)
        })

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
            map.remove()
            mapRef.current = null
            setMapInstance(null)
        }
    }, [])

    // Update GeoJSON route data on map
    useEffect(() => {
        const map = mapRef.current
        if (!map || !mapInstance || !map.isStyleLoaded()) return

        const updateSourceData = (sourceId, coords) => {
            const src = map.getSource(sourceId)
            if (src) {
                src.setData({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: coords.length >= 2 ? coords : []
                    }
                })
            }
        }

        updateSourceData('pickup-route', displayPickupCoords)
        updateSourceData('delivery-route', displayDeliveryCoords)
        updateSourceData('fallback-route', !hasGraphRoute ? straightLine : [])
    }, [mapInstance, displayPickupCoords, displayDeliveryCoords, straightLine, hasGraphRoute])

    // Animated dash flow for the pickup route (Ambulance -> Patient)
    useEffect(() => {
        const map = mapRef.current
        if (!map || !mapInstance || displayPickupCoords.length < 2) return

        let dashOffset = 0
        const animate = () => {
            dashOffset = (dashOffset + 0.15) % 8
            if (map.getLayer('pickup-line')) {
                map.setPaintProperty('pickup-line', 'line-dasharray', [2, 2])
            }
            animFrameRef.current = requestAnimationFrame(animate)
        }

        animFrameRef.current = requestAnimationFrame(animate)
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        }
    }, [mapInstance, displayPickupCoords])

    // Fly bounds only when a new request is selected
    useEffect(() => {
        const map = mapRef.current
        if (!map || !selectedResult) return
        const bb = bbox(hasGraphRoute ? [displayPickupCoords, displayDeliveryCoords] : [straightLine])
        if (!bb) return
        map.fitBounds(bb, { padding: 80, maxZoom: 11, duration: 900 })
    }, [selectedResult?.requestId])

    // Render Markers
    useEffect(() => {
        const map = mapRef.current
        if (!map || !mapInstance) return

        markersRef.current.forEach(m => m.remove())
        markersRef.current = []

        // Hospital markers
        for (const h of hospitals) {
            if (h.lat == null || h.lng == null) continue
            const el = createMarkerElement('hospital', h.name, `${h.bedsAvailable ?? 0} beds`)
            const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
                .setLngLat([h.lng, h.lat])
                .addTo(map)
            markersRef.current.push(marker)
        }

        // Ambulance markers
        for (const a of ambulances) {
            if (a.lat == null || a.lng == null) continue
            const el = createMarkerElement('ambulance', a.name ?? `Ambulance ${a.id}`, a.status)
            const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
                .setLngLat([a.lng, a.lat])
                .addTo(map)
            markersRef.current.push(marker)
        }

        // Patient Marker
        if (patientPoint) {
            const el = createMarkerElement('patient', 'Emergency Patient')
            const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
                .setLngLat(patientPoint)
                .addTo(map)
            markersRef.current.push(marker)
        }

        // Center map if no route selected
        if (!selectedResult) {
            const pts = [...hospitals, ...ambulances].filter(r => r.lat != null)
            if (pts.length) {
                const c = centerOf(pts)
                map.flyTo({ center: [c.lng, c.lat], zoom: 11, speed: 0.8 })
            }
        }
    }, [mapInstance, hospitals, ambulances, selectedResult, patientPoint])

    // Status badge
    const badge = {
        idle: null,
        evaluating: {
            text: (
                <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-emerald-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Running Dijkstra / A* route optimization…
                </span>
            ),
            cls: 'bg-emerald-950/95 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-950/80'
        },
        fallback: { text: 'Showing direct path (Snapping road network…)', cls: 'bg-blue-900/80 text-blue-300 border-blue-500/30' },
        snapping: { text: 'Snapping route to road network…', cls: 'bg-amber-900/80 text-amber-200 border-amber-500/30 animate-pulse' },
        done: {
            text: `Road path routed ✓ (${selectedResult?.travelTimeMinutes ?? '?'} min total)`,
            cls: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-950/50',
        },
    }[selectedRequest && !selectedResult ? 'evaluating' : routeStatus]

    return (
        <div className="relative flex-1 rounded-xl border border-white/10 overflow-hidden shadow-2xl bg-zinc-950" style={{ minHeight: '420px' }}>
            {/* MapLibre canvas */}
            <div ref={mapContainer} className="absolute inset-0" />

            {/* Map Action Controls: Recenter/Focus Route & Maximize/Minimize */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                <button
                    onClick={handleFocusRoute}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950/90 text-xs font-semibold text-white/90 border border-white/15 shadow-xl backdrop-blur-md transition hover:bg-zinc-800 hover:text-emerald-400 active:scale-95 cursor-pointer"
                    title="Recenter camera to active patient route"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    Focus Route
                </button>
                <button
                    onClick={onToggleMaximize}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950/90 text-xs font-semibold text-white/90 border border-white/15 shadow-xl backdrop-blur-md transition hover:bg-zinc-800 hover:text-amber-400 active:scale-95 cursor-pointer"
                    title={isMaximized ? "Restore default dashboard view" : "Maximize map to full screen"}
                >
                    {isMaximized ? (
                        <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0l4 0m-4 0l0 4m11 5l5 5m0 0l-4 0m4 0l0-4" /></svg>
                            Minimize
                        </>
                    ) : (
                        <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-2V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                            Maximize
                        </>
                    )}
                </button>
            </div>

            {/* Status badge */}
            {badge && (
                <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${badge.cls} whitespace-nowrap shadow-md`}>
                    {badge.text}
                </div>
            )}

            {/* Trip time breakdown badge */}
            {selectedResult?.feasible && hasGraphRoute && (
                <div className="absolute top-11 left-1/2 -translate-x-1/2 z-10 flex gap-2 text-[10px] font-semibold whitespace-nowrap">
                    <span className="bg-amber-950/90 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-sm flex items-center gap-1">
                        <svg className="w-3 h-3 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 17a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4zM4 17V6a1 1 0 011-1h9v12m0-12h3.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V17h-2M11 9H7m2-2v4" /></svg>
                        Pickup: {selectedResult.pickupTimeMinutes ?? '?'} min
                    </span>
                    <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-sm flex items-center gap-1">
                        <svg className="w-3 h-3 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4M9 7h6m-3-3v6" /></svg>
                        Delivery: {selectedResult.deliveryTimeMinutes ?? '?'} min
                    </span>
                    {selectedResult.queueDelayMinutes > 0 && (
                        <span className="bg-rose-950/90 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-sm flex items-center gap-1">
                            <svg className="w-3 h-3 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Queue: {selectedResult.queueDelayMinutes} min
                        </span>
                    )}
                </div>
            )}

            {/* Hint when nothing selected */}
            {!selectedResult && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full text-xs font-medium bg-black/70 text-white/70 backdrop-blur-md border border-white/10 pointer-events-none shadow-md">
                    Select an emergency dispatch request to view route details
                </div>
            )}

            {/* Legend & Request Graph Telemetry Panel */}
            <div className="absolute bottom-4 left-3 z-10 flex flex-col gap-2 max-w-xs">
                {/* Active Request Graph Telemetry Detail */}
                {selectedRequest && selectedResult?.feasible && (
                    <div className="text-[11px] text-white/90 bg-zinc-950/90 backdrop-blur-md rounded-xl p-2.5 border border-emerald-500/30 shadow-2xl transition-all duration-200">
                        <div 
                            onClick={() => setShowTelemetry(prev => !prev)}
                            className="flex items-center justify-between cursor-pointer select-none"
                        >
                            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                                Graph Telemetry ({selectedRequest.villageName})
                            </span>
                            <button 
                                className="text-[10px] text-emerald-300 hover:text-white bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold flex items-center gap-1"
                            >
                                <span>{showTelemetry ? 'Hide Details' : 'View Details'}</span>
                                <svg className={`w-3 h-3 transition-transform ${showTelemetry ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                        </div>

                        {showTelemetry && (
                            <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-col gap-1.5 animate-in fade-in zoom-in duration-150">
                                <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                                    <div className="bg-zinc-900/80 p-1.5 rounded border border-white/5 flex flex-col">
                                        <span className="text-white/40 text-[9px] uppercase tracking-wider">Pickup Nodes</span>
                                        <span className="text-amber-300 font-bold">{displayPickupCoords.length} Graph Points</span>
                                    </div>
                                    <div className="bg-zinc-900/80 p-1.5 rounded border border-white/5 flex flex-col">
                                        <span className="text-white/40 text-[9px] uppercase tracking-wider">Transport Nodes</span>
                                        <span className="text-emerald-300 font-bold">{displayDeliveryCoords.length} Graph Points</span>
                                    </div>
                                    <div className="bg-zinc-900/80 p-1.5 rounded border border-white/5 flex flex-col">
                                        <span className="text-white/40 text-[9px] uppercase tracking-wider">Total Path Edges</span>
                                        <span className="text-cyan-300 font-bold">{Math.max(0, displayPickupCoords.length + displayDeliveryCoords.length - 2)} Road Segments</span>
                                    </div>
                                    <div className="bg-zinc-900/80 p-1.5 rounded border border-white/5 flex flex-col">
                                        <span className="text-white/40 text-[9px] uppercase tracking-wider">Algorithm</span>
                                        <span className="text-purple-300 font-bold">Dijkstra / A*</span>
                                    </div>
                                </div>
                                <div className="mt-1 text-[9.5px] text-white/50 flex items-center justify-between border-t border-white/5 pt-1.5 font-mono">
                                    <span>Specialty: <span className="text-white capitalize">{selectedRequest.specialtyNeeded.replace('_', ' ')}</span></span>
                                    <span>Priority: <span className="text-emerald-400 font-bold uppercase">{selectedRequest.urgencyTier}</span></span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Map Symbols Legend */}
                <div className="flex flex-col gap-1.5 text-[11px] text-white/80 bg-zinc-950/85 backdrop-blur-md rounded-xl p-2.5 border border-white/10 shadow-2xl pointer-events-none">
                    <span className="flex items-center gap-2 font-medium"><span className="h-2 w-4 rounded-sm bg-emerald-400 shadow-sm shadow-emerald-400"></span> Patient → Hospital (Transport)</span>
                    <span className="flex items-center gap-2 font-medium"><span className="h-2 w-4 rounded-sm bg-amber-400 shadow-sm shadow-amber-400"></span> Ambulance → Patient (Dispatch)</span>
                    <div className="my-0.5 border-t border-white/10"></div>
                    <span className="flex items-center gap-1.5 text-emerald-300">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4M9 7h6m-3-3v6" /></svg>
                        Hospital
                    </span>
                    <span className="flex items-center gap-1.5 text-blue-300">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 17a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4zM4 17V6a1 1 0 011-1h9v12m0-12h3.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V17h-2M11 9H7m2-2v4" /></svg>
                        Available Ambulance
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-300">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 17a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4zM4 17V6a1 1 0 011-1h9v12m0-12h3.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V17h-2M11 9H7m2-2v4" /></svg>
                        En Route Ambulance
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-400">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Patient Location
                    </span>
                </div>
            </div>
        </div>
    )
}
