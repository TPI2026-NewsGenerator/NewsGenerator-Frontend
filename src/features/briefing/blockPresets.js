//
//  Author: Fabian Rostello
//  Date: 06.11.2026
//  File: blockPresets.js
//  Description: What the presets "Short", "Standard" and "Everything" put in a story, as the reader sets it in the settings (the user,
//               06.11.2026): for the e-mail (the presets of its editor) and for the page of the briefing (the preset the page shows its
//               cards in). The ones of mailBlocks.js are the ones at first; what the reader changes is kept in the browser
//

import {useMemo, useSyncExternalStore} from "react";
import {BLOCKS, PRESETS} from "@/features/briefing/mailBlocks.js";

// the two places that have presets, each its own: the e-mail, and the page of the briefing
export const SCOPES = {
    mail: {key: 'newsgenerator.mail-presets'},
    page: {key: 'newsgenerator.page-presets'},
};
const CHANGED = 'newsgenerator:block-presets';
const ORDER = BLOCKS.map(block => block.key);
// kept for the page when the browser keeps nothing (a private window)
const memory = new Map();

const stored = (scope) => {
    try {
        return localStorage.getItem(SCOPES[scope].key) ?? '';
    } catch {
        return memory.get(scope) ?? '';
    }
};
const same = (a, b) => a.length === b.length && a.every(key => b.includes(key));

// The presets of what the reader kept ('' or the JSON of {preset: [block]}): each with its blocks (in the order of the blocks), whether
// they are not the ones at first. A list nobody wrote well is the one at first
export const presetsFrom = (raw) => {
    let kept = {};
    try {
        kept = JSON.parse(raw || '{}') ?? {};
    } catch {
        kept = {};
    }
    return PRESETS.map(preset => {
        const own = Array.isArray(kept[preset.value]) ? ORDER.filter(key => kept[preset.value].includes(key)) : null;
        const on = own ?? preset.on;
        return {...preset, on, changed: !same(on, preset.on)};
    });
};

const subscribe = (notify) => {
    window.addEventListener('storage', notify);
    window.addEventListener(CHANGED, notify);
    return () => {
        window.removeEventListener('storage', notify);
        window.removeEventListener(CHANGED, notify);
    };
};

// the presets of a scope ('mail' or 'page'), and the ways to change them: set(preset, block, on) puts a block in or out of a preset, reset(preset)
// puts it back as it was at first. Every place that reads them is told at once
export const usePresets = (scope) => {
    const raw = useSyncExternalStore(subscribe, () => stored(scope), () => '');
    const presets = useMemo(() => presetsFrom(raw), [raw]);
    const keep = (lists) => {
        const text = JSON.stringify(lists);
        memory.set(scope, text);
        try {
            localStorage.setItem(SCOPES[scope].key, text);
        } catch {
            // kept for the page only
        }
        window.dispatchEvent(new Event(CHANGED));
    };
    const lists = () => Object.fromEntries(presets.map(preset => [preset.value, preset.on]));
    return {
        presets,
        set: (value, block, on) => keep({...lists(), [value]: ORDER.filter(key => (key === block ? on : lists()[value].includes(key)))}),
        reset: (value) => keep({...lists(), [value]: PRESETS.find(preset => preset.value === value).on}),
    };
};

// the preset the page shows its cards in: the one the reader chose last, "Everything" at first (the page showed all of it before)
export const DEFAULT_SHOW = 'everything';
const SHOW_KEY = 'newsgenerator.briefing-show';
export const keptShow = () => {
    try {
        const value = localStorage.getItem(SHOW_KEY);
        return PRESETS.some(preset => preset.value === value) ? value : DEFAULT_SHOW;
    } catch {
        return DEFAULT_SHOW;
    }
};
export const keepShow = (value) => {
    try {
        localStorage.setItem(SHOW_KEY, value);
    } catch {
        // kept for the page only
    }
};
