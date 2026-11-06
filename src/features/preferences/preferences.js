//
//  Author: Fabian Rostello
//  Date: 06.11.2026
//  File: preferences.js
//  Description: The display preferences of the reader, kept in the browser and on their account (the user, 06.11.2026) so that their phone
//               and their laptop show the same. The browser answers at once and the account catches up: read once after the sign-in, it wins
//               over what this browser kept; what it has none of is sent from here (what the reader set before this existed); every change
//               goes up after a short wait. Without a session, or when the server does not answer, a preference is kept in the browser
//               alone, as it always was
//

import {PreferencesApi} from "@/features/preferences/preferencesApi.js";

// the wait after a change before it is sent: a box ticked five times in a row is sent once
export const SEND_DELAY = 800;
// the names of the preferences changed here and not sent yet, and the account whose preferences this browser keeps
const UNSENT = 'newsgenerator.preferences-unsent';
const OWNER = 'newsgenerator.preferences-owner';

const definitions = new Map();
const listeners = new Set();
// kept for the page when the browser keeps nothing (a private window)
const memory = new Map();

let reader = null;          // the account whose preferences are followed, null: nobody is signed in and the browser alone keeps them
let account = null;         // what the account has, null until it answered
const pending = new Set();  // the names changed here to send
let timer = null;

const stored = (key) => {
    try {
        return localStorage.getItem(key);
    } catch {
        return memory.get(key) ?? null;
    }
};
const store = (key, text) => {
    memory.set(key, text);
    try {
        localStorage.setItem(key, text);
    } catch {
        // kept for the page only
    }
};
const drop = (key) => {
    memory.delete(key);
    try {
        localStorage.removeItem(key);
    } catch {
        // kept for the page only
    }
};

const notify = () => listeners.forEach(listener => listener());

// what a component reads with: it is told when a preference changes here, or in another tab of the browser
export const subscribe = (listener) => {
    listeners.add(listener);
    window.addEventListener('storage', listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', listener);
    };
};

// kept in the browser: a change is not lost when the page is closed before it went up, or the network was down
const unsent = () => {
    try {
        const names = JSON.parse(stored(UNSENT) ?? '[]');
        return new Set(Array.isArray(names) ? names : []);
    } catch {
        return new Set();
    }
};
const keepUnsent = (names) => names.size === 0 ? drop(UNSENT) : store(UNSENT, JSON.stringify([...names]));

const plain = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// Goes up what was changed here. The preferences that did not go (offline, refused, no session any more) stay in the browser, as they
// are: they go up with the next change, or after the next sign-in
const flush = async () => {
    clearTimeout(timer);
    timer = null;
    if (reader === null || pending.size === 0) return;
    const names = [...pending];
    pending.clear();

    const changes = {};
    for (const name of names) {
        const value = definitions.get(name)?.chosen();
        if (value !== undefined) changes[name] = value;
    }
    if (Object.keys(changes).length > 0) {
        const answer = await PreferencesApi.save(changes).catch(() => null);
        if (!answer || answer.error) return;
    }
    // sent: not waiting any more, unless the reader changed it again meanwhile
    const waiting = unsent();
    names.filter(name => !pending.has(name)).forEach(name => waiting.delete(name));
    keepUnsent(waiting);
};

const send = (name) => {
    pending.add(name);
    keepUnsent(unsent().add(name));
    clearTimeout(timer);
    timer = setTimeout(flush, SEND_DELAY);
};

// The value the account has for a preference, as the page would have chosen it: undefined when it has none, or none the page offers
const fromAccount = (definition) => {
    if (!Object.hasOwn(account, definition.name)) return undefined;
    try {
        return definition.parse(definition.serialize(account[definition.name]));
    } catch {
        return undefined;
    }
};

// Whether the value of this browser changed to the one of the account. Changed here and not sent yet: the value here is the newer, it
// goes up. The account has none: what this browser kept goes up
const reconcile = (definition) => {
    if (unsent().has(definition.name)) {
        send(definition.name);
        return false;
    }
    const theirs = fromAccount(definition);
    if (theirs === undefined) {
        if (definition.chosen() !== undefined) send(definition.name);
        return false;
    }
    const text = definition.serialize(theirs);
    if (text === stored(definition.key)) return false;
    store(definition.key, text);
    return true;
};

// what this browser kept belongs to the last account that signed in: not to this one
const forgetKept = () => {
    definitions.forEach(definition => drop(definition.key));
    drop(UNSENT);
    notify();
};

// A preference of the reader. name: what the account calls it (see server/services/utils/preferences.js); key: where the browser keeps it;
// fallback: the value of a reader who chose nothing; parse(text): the value in a text the browser kept, undefined when it is none the page
// offers; serialize(value): the text to keep, the value itself by default. -> {chosen(), kept(), keep(value), text(), ...}
export const preference = ({name, key, fallback, parse, serialize = String}) => {
    const definition = {
        name, key, fallback, parse, serialize,
        // the value the reader set in this browser, undefined if they set none (or none the page offers)
        chosen: () => {
            const text = stored(key);
            return text === null ? undefined : parse(text);
        },
        // the value to use now: the reader's, else the one at first. Never waits for the network
        kept: () => definition.chosen() ?? fallback,
        // sets it: kept in the browser at once, every component that reads it told, and sent to the account after a short wait
        keep: (value) => {
            const text = serialize(value);
            if (text === stored(key)) return;
            store(key, text);
            notify();
            if (reader !== null) send(name);
        },
        // what a component compares to know it changed (see usePreference.js)
        text: () => stored(key) ?? '',
    };
    definitions.set(name, definition);
    return definition;
};

// The reader signed in: their preferences are read from the account, once. A failed call leaves the browser's as they are
export const startPreferences = async (userId) => {
    const id = String(userId);
    if (reader === id) return;
    // what waits to go up belongs to the account of before, never to this one
    clearTimeout(timer);
    timer = null;
    pending.clear();
    reader = id;
    account = null;

    // the first account to sign in on a browser takes what it kept (set before this existed); another account does not
    const owner = stored(OWNER);
    if (owner !== null && owner !== id) forgetKept();
    store(OWNER, id);

    const answer = await PreferencesApi.get().catch(() => null);
    if (reader !== id || !answer || answer.error || !plain(answer.preferences)) return;
    account = answer.preferences;
    // every preference there is must be known here: see registered.js
    const changed = [...definitions.values()].map(reconcile).some(Boolean);
    if (changed) notify();
};

// The reader signed out: what waits to go up goes now, while the session lasts, and the account is not followed any more
export const endPreferences = () => {
    const sending = flush();
    reader = null;
    account = null;
    return sending;
};
