import Graph from './Graph.js';

const HIGHWAY_EXCLUDE = ["footway", "street_lamp", "steps", "pedestrian", "track", "path"];

/**
 * Fetches road network from OpenStreetMap Overpass API for a bounding box.
 * No API key required — public endpoint.
 * @param {{minLat, maxLat, minLon, maxLon}} bbox
 * @returns {Promise<Graph>}
 */
export async function fetchRoadGraph(bbox) {
    const exclusion = HIGHWAY_EXCLUDE.map(e => `[highway!="${e}"]`).join('');
    const query = `
[out:json];(
  way[highway]${exclusion}[footway!="*"]
  (${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon});
  node(w);
);
out skel;`;

    const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
    });
    if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
    const data = await res.json();

    const graph = new Graph();
    for (const el of data.elements) {
        if (el.type === 'node') {
            graph.addNode(el.id, el.lat, el.lon);
        }
    }
    for (const el of data.elements) {
        if (el.type === 'way' && el.nodes?.length >= 2) {
            for (let i = 0; i < el.nodes.length - 1; i++) {
                const n1 = graph.getNode(el.nodes[i]);
                const n2 = graph.getNode(el.nodes[i + 1]);
                if (n1 && n2) n1.connectTo(n2);
            }
        }
    }
    return graph;
}

/**
 * Returns the node in the graph nearest to the given lat/lng.
 * @param {Graph} graph
 * @param {number} lat
 * @param {number} lng
 * @returns {import('./Node.js').default|null}
 */
export function nearestNode(graph, lat, lng) {
    let best = null;
    let bestDist = Infinity;
    for (const node of graph.nodes.values()) {
        const d = Math.hypot(node.latitude - lat, node.longitude - lng);
        if (d < bestDist) {
            bestDist = d;
            best = node;
        }
    }
    return best;
}

/**
 * Builds a bounding box that covers two lat/lng points with padding.
 */
export function buildBbox(lat1, lng1, lat2, lng2, padDeg = 0.01) {
    return {
        minLat: Math.min(lat1, lat2) - padDeg,
        maxLat: Math.max(lat1, lat2) + padDeg,
        minLon: Math.min(lng1, lng2) - padDeg,
        maxLon: Math.max(lng1, lng2) + padDeg,
    };
}

/**
 * Reconstructs the path from end → start using parent pointers.
 * Returns array of [lng, lat] pairs for GeoJSON.
 * @param {import('./Node.js').default} endNode
 * @returns {[number, number][]}
 */
export function reconstructPath(endNode) {
    const coords = [];
    let cur = endNode;
    while (cur) {
        coords.push([cur.longitude, cur.latitude]);
        cur = cur.parent;
    }
    return coords.reverse();
}
