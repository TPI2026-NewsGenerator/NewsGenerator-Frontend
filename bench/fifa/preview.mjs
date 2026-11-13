//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: preview.mjs
//  Description: The client of the page "The FIFA presidency" against its mock API, in one command (.claude/launch.json "fifa-mock"):
//               the mock on 3998, Vite on 5180 with its /api sent to the mock. The real server is not used
//
//  node bench/fifa/preview.mjs
//

import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {startMockApi, PORT} from './fifa-mock-api.mjs';

await startMockApi();
process.env.API_TARGET = `http://127.0.0.1:${PORT}`;
// the client folder, wherever this is launched from
const root = fileURLToPath(new URL('../..', import.meta.url));
const server = await createServer({root, configFile: fileURLToPath(new URL('../../vite.config.js', import.meta.url)), server: {port: 5180, strictPort: true}});
await server.listen();
server.printUrls();
