//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: geometry.js
//  Description: The base map of the page "The FIFA presidency" made drawable: the TopoJSON of public/fifa-map.topo.json (see
//               scripts/build-map.mjs) in the Equal Earth projection, a path for each country, and for each member whether it is drawn
//               as a polygon or as a round marker. A member is a marker when its polygon does not exist or is too small to be touched
//               (under MARKER_KM2): about fifty of the 211. The key of a member is its association (its ISO code), never the polygon:
//               the borders are indicative
//

import {geoEqualEarth, geoGraticule, geoPath} from "d3-geo";
import {feature} from "topojson-client";

export const WIDTH = 1000;
// the land area under which a member is a marker: the same fifty or so members as the "small associations" list of the map
export const MARKER_KM2 = 12000;
// the radius of a marker on the screen, and of the invisible circle that takes the touch (24 px at least)
export const MARKER_R = 6;
export const HIT_R = 13;
// Antarctica is not drawn: the map stops at 58°S
const FRAME = geoGraticule().extentMajor([[-180, -58], [180, 84]]).outline();

export const projection = geoEqualEarth().fitWidth(WIDTH, FRAME);
const path = geoPath(projection);
const bounds = path.bounds(FRAME);
export const HEIGHT = Math.ceil(bounds[1][1]);

// Where the TopoJSON is served from; the page loads it once
let loading = null;
export const loadTopology = () => {
    loading ??= fetch(`${import.meta.env.BASE_URL}fifa-map.topo.json`)
        .then(response => {
            if (!response.ok) throw new Error(`The base map answered ${response.status}`);
            return response.json();
        })
        .catch(error => {
            loading = null;
            throw error;
        });
    return loading;
};

// The shapes of a topology: {lands: [{id, d, km2}] every country with a code, other: the d of the land with none}
export const shapesOf = (topology) => {
    const units = feature(topology, topology.objects.units).features;
    return {
        lands: units.map(unit => ({id: unit.id, d: path(unit), km2: unit.properties?.km2 ?? 0})),
        other: path(feature(topology, topology.objects.other)),
    };
};

// How the members are drawn: {polygons: [{member, d, x, y}], markers: [{member, x, y}]}. x, y: where the member is, in the units of the
// map (the middle of its polygon, or its coordinates), where the arrow keys go from. Members that are not associations are left out;
// the polygons of the countries that are not members, and the ones under a marker, are `land`: quiet, not touched
export const layoutOf = (members, shapes) => {
    const byId = new Map(shapes.lands.map(land => [land.id, land]));
    const polygons = [];
    const markers = [];
    const taken = new Set();
    for (const member of members) {
        if (member.level !== 'association') continue;
        const land = byId.get(member.iso);
        const point = member.lng !== null && member.lat !== null && member.lng !== undefined && member.lat !== undefined ? projection([member.lng, member.lat]) : null;
        if (land?.d && land.km2 >= MARKER_KM2) {
            taken.add(land.id);
            // the middle of the box of the polygon is enough to say which neighbour is on the left or on the right
            polygons.push({member, d: land.d, x: point?.[0] ?? 0, y: point?.[1] ?? 0});
        } else if (point) {
            markers.push({member, x: point[0], y: point[1]});
        }
    }
    return {polygons, markers, land: shapes.lands.filter(land => !taken.has(land.id) && land.d)};
};

export const frameD = path(FRAME);
