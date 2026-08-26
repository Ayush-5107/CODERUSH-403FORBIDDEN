import { useState, useEffect, useRef, useCallback } from 'react';
import AStar from '../pathfinding/AStar.js';
import { fetchRoadGraph, nearestNode, buildBbox, reconstructPath } from '../pathfinding/osmGraph.js';

/**
 * Drives an A* pathfinding animation between two real-world lat/lng points.
 *
 * @param {{lat: number, lng: number}|null} origin     Start point (e.g. ambulance)
 * @param {{lat: number, lng: number}|null} destination End point  (e.g. patient or hospital)
 * @param {number} stepIntervalMs  How fast to animate (default 30ms between steps)
 *
 * @returns {{
 *   visitedCoords: [number, number][],   // GeoJSON [lng, lat] pairs of explored nodes
 *   routeCoords:   [number, number][],   // final path coords
 *   status: 'idle'|'loading'|'exploring'|'done'|'error',
 *   errorMessage: string|null,
 *   reset: () => void,
 * }}
 */
export function usePathfindingAnimation(origin, destination, stepIntervalMs = 30) {
    const [status, setStatus] = useState('idle');
    const [visitedCoords, setVisitedCoords] = useState([]);
    const [routeCoords, setRouteCoords] = useState([]);
    const [errorMessage, setErrorMessage] = useState(null);

    const timerRef = useRef(null);
    const astarRef = useRef(null);
    const graphRef = useRef(null);
    const endNodeRef = useRef(null);
    // Keep a live ref to the visited list so the interval closure can append without stale state
    const visitedRef = useRef([]);

    const clearTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const reset = useCallback(() => {
        clearTimer();
        setStatus('idle');
        setVisitedCoords([]);
        setRouteCoords([]);
        setErrorMessage(null);
        visitedRef.current = [];
        astarRef.current = null;
        graphRef.current = null;
        endNodeRef.current = null;
    }, []);

    useEffect(() => {
        if (!origin || !destination) {
            reset();
            return;
        }

        let cancelled = false;

        async function run() {
            reset();
            setStatus('loading');

            try {
                const bbox = buildBbox(origin.lat, origin.lng, destination.lat, destination.lng);
                const graph = await fetchRoadGraph(bbox);
                if (cancelled) return;

                graphRef.current = graph;

                const startNode = nearestNode(graph, origin.lat, origin.lng);
                const endNode = nearestNode(graph, destination.lat, destination.lng);

                if (!startNode || !endNode) {
                    throw new Error('Could not find road nodes near the given coordinates.');
                }

                graph.startNode = startNode;
                endNodeRef.current = endNode;

                const algo = new AStar();
                algo.start(startNode, endNode);
                astarRef.current = algo;

                setStatus('exploring');

                timerRef.current = setInterval(() => {
                    const algo = astarRef.current;
                    if (!algo || algo.finished) {
                        clearTimer();

                        // Reconstruct path
                        const end = endNodeRef.current;
                        if (end && end.parent) {
                            const path = reconstructPath(end);
                            setRouteCoords(path);
                        }
                        setStatus('done');
                        return;
                    }

                    // Run multiple steps per frame for speed
                    const STEPS_PER_TICK = 12;
                    for (let i = 0; i < STEPS_PER_TICK; i++) {
                        if (algo.finished) break;
                        const updated = algo.nextStep();
                        for (const node of updated) {
                            visitedRef.current.push([node.longitude, node.latitude]);
                        }
                    }

                    // Trigger react re-render with a new array reference
                    setVisitedCoords([...visitedRef.current]);
                }, stepIntervalMs);
            } catch (err) {
                if (cancelled) return;
                console.error('[usePathfindingAnimation]', err);
                setErrorMessage(err.message);
                setStatus('error');
            }
        }

        run();

        return () => {
            cancelled = true;
            clearTimer();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

    return { visitedCoords, routeCoords, status, errorMessage, reset };
}
