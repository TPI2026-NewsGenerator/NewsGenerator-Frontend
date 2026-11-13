//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: build-map.mjs
//  Description: The base map of the page "The FIFA presidency", public/fifa-map.topo.json: the Natural Earth map units at 1:50m
//               (public domain, https://www.naturalearthdata.com/) simplified and quantised into a TopoJSON of two objects:
//                 units  one geometry per country or territory that has a code, its id that code (ISO 3166-1 alpha-2, GB-ENG,
//                        GB-SCT, GB-WLS and GB-NIR for the four nations of the United Kingdom: the map units separate them),
//                        properties.km2 its land area, which decides on the client whether a member is drawn as a marker. The
//                        file does not know who is a member: the page draws the ones the server lists, the rest as quiet land
//                 other  the land with no code (Northern Cyprus, Somaliland...)
//               Antarctica is left out. The borders are indicative: the key of a member is its association, not its polygon, so a
//               border the world disputes (Palestine, Taiwan, Kosovo, Western Sahara) is never a statement. The geometry is plain
//               TopoJSON: changing the renderer later does not redo it
//
//  node scripts/build-map.mjs [ne_50m_admin_0_map_units.geojson] [--keep=0.07] [--quantization=20000]
//  Without a file, the GeoJSON of the repository natural-earth-vector is fetched (3 MB) into the temporary folder of the machine
//

import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import process from 'node:process';
import {geoArea} from 'd3-geo';
import {topology} from 'topojson-server';
import {presimplify, quantile, simplify} from 'topojson-simplify';
import {quantize} from 'topojson-client';

const SOURCE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_map_units.geojson';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/fifa-map.topo.json');
const EARTH_KM = 6371;
// the part of the points of the lines kept (0 to 1, option --keep): the smaller, the lighter the file and the rougher the coast
const GZIP_BUDGET = 250 * 1024;

const options = Object.fromEntries(process.argv.slice(2).filter(arg => arg.startsWith('--')).map(arg => arg.slice(2).split('=')));
const keep = Number(options.keep ?? 0.25);
const quantization = Number(options.quantization ?? 20000);
const given = process.argv.slice(2).find(arg => !arg.startsWith('--'));

const read = async () => {
    if (given) return JSON.parse(readFileSync(given, 'utf8'));
    const cache = join(tmpdir(), 'ne_50m_admin_0_map_units.geojson');
    if (!existsSync(cache)) {
        console.log(`fetching ${SOURCE}`);
        const response = await fetch(SOURCE);
        if (!response.ok) throw new Error(`Natural Earth answered ${response.status}`);
        mkdirSync(dirname(cache), {recursive: true});
        writeFileSync(cache, Buffer.from(await response.arrayBuffer()));
    }
    return JSON.parse(readFileSync(cache, 'utf8'));
};

const NATIONS = {ENG: 'GB-ENG', SCT: 'GB-SCT', WLS: 'GB-WLS', NIR: 'GB-NIR'};
// the code of the country of a map unit: Natural Earth leaves -99 in ISO_A2 for France, Norway, Kosovo..., ISO_A2_EH has them
const keyOf = (properties) => NATIONS[properties.SU_A3] ?? (properties.ISO_A2_EH && properties.ISO_A2_EH !== '-99' ? properties.ISO_A2_EH : null);

const polygonsOf = (geometry) => geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;

const main = async () => {
    const source = await read();
    const byKey = new Map();
    const other = [];
    for (const feature of source.features) {
        const properties = feature.properties;
        if (properties.ADM0_A3 === 'ATA' || properties.SU_A3 === 'ATA') continue;
        const key = keyOf(properties);
        if (!key) {
            other.push(...polygonsOf(feature.geometry));
            continue;
        }
        byKey.set(key, [...(byKey.get(key) ?? []), ...polygonsOf(feature.geometry)]);
    }

    const units = [...byKey].sort(([a], [b]) => a.localeCompare(b)).map(([key, polygons]) => {
        const geometry = {type: 'MultiPolygon', coordinates: polygons};
        const km2 = Math.round(geoArea({type: 'Feature', geometry}) * EARTH_KM ** 2);
        return {type: 'Feature', id: key, properties: {km2}, geometry};
    });
    const land = {type: 'Feature', properties: {}, geometry: {type: 'MultiPolygon', coordinates: other}};

    let topo = topology({units: {type: 'FeatureCollection', features: units}, other: land});
    topo = presimplify(topo);
    topo = simplify(topo, quantile(topo, keep));
    topo = quantize(topo, quantization);
    // presimplify leaves the weight of each point as a third number: it is not needed once simplified
    for (const arc of topo.arcs) for (const point of arc) point.length = 2;

    const json = JSON.stringify(topo);
    const gzip = gzipSync(json, {level: 9}).length;
    writeFileSync(OUT, json);
    console.log(`${units.length} units with a code, ${other.length} polygons with none`);
    console.log(`${OUT}: ${(json.length / 1024).toFixed(0)} KB, ${(gzip / 1024).toFixed(0)} KB gzip (budget ${GZIP_BUDGET / 1024} KB)`);
    if (gzip > GZIP_BUDGET) {
        console.error('Over the budget: lower --keep or --quantization.');
        process.exitCode = 1;
    }
};

await main();
