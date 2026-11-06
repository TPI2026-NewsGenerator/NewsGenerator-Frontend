//
//  Author: Fabian Rostello
//  Date: 06.11.2026
//  File: blockPresets.js
//  Description: What the presets "Short", "Standard" and "Everything" put in a story, as the reader sets it in the settings (the user,
//               06.11.2026): for the e-mail (the presets of its editor) and for the page of the briefing (the preset the page shows its
//               cards in). The ones of mailBlocks.js are the ones at first; what the reader changes is kept in the browser and on the
//               account (see features/preferences)
//

import {useMemo} from "react";
import {BLOCKS, PRESETS} from "@/features/briefing/mailBlocks.js";
import {preference} from "@/features/preferences/preferences.js";
import {usePreference} from "@/features/preferences/usePreference.js";

const ORDER = BLOCKS.map(block => block.key);
const same = (a, b) => a.length === b.length && a.every(key => b.includes(key));

// What the reader kept ('' or the JSON of {preset: [block]}) as {preset: [block]}: the lists there are, each with its blocks in the order of
// the blocks, the unknown ones dropped. undefined when it is no list of blocks at all
const keptLists = (raw) => {
    let kept;
    try {
        kept = JSON.parse(raw || '{}');
    } catch {
        return undefined;
    }
    if (kept === null || typeof kept !== 'object' || Array.isArray(kept)) return undefined;
    const lists = Object.fromEntries(PRESETS.filter(preset => Array.isArray(kept[preset.value]))
        .map(preset => [preset.value, ORDER.filter(key => kept[preset.value].includes(key))]));
    return Object.keys(lists).length > 0 ? lists : undefined;
};

// the presets with the blocks of what the reader kept, whether they are not the ones at first. A list nobody wrote well is the one at first
const presetsOf = (kept) => PRESETS.map(preset => {
    const on = kept[preset.value] ?? preset.on;
    return {...preset, on, changed: !same(on, preset.on)};
});

// The presets of what the reader kept ('' or the JSON of {preset: [block]}): each with its blocks (in the order of the blocks), whether
// they are not the ones at first. A list nobody wrote well is the one at first
export const presetsFrom = (raw) => presetsOf(keptLists(raw) ?? {});

// the two places that have presets, each its own: the e-mail, and the page of the briefing
export const SCOPES = {
    mail: preference({name: 'mailPresets', key: 'newsgenerator.mail-presets', fallback: {}, parse: keptLists, serialize: JSON.stringify}),
    page: preference({name: 'pagePresets', key: 'newsgenerator.page-presets', fallback: {}, parse: keptLists, serialize: JSON.stringify}),
};

// the presets of a scope ('mail' or 'page'), and the ways to change them: set(preset, block, on) puts a block in or out of a preset, reset(preset)
// puts it back as it was at first. Every place that reads them is told at once
export const usePresets = (scope) => {
    const [kept, keep] = usePreference(SCOPES[scope]);
    const presets = useMemo(() => presetsOf(kept), [kept]);
    const lists = () => Object.fromEntries(presets.map(preset => [preset.value, preset.on]));
    return {
        presets,
        set: (value, block, on) => keep({...lists(), [value]: ORDER.filter(key => (key === block ? on : lists()[value].includes(key)))}),
        reset: (value) => keep({...lists(), [value]: PRESETS.find(preset => preset.value === value).on}),
    };
};

// the preset the page shows its cards in: the one the reader chose last, "Everything" at first (the page showed all of it before)
export const DEFAULT_SHOW = 'everything';
export const showPreference = preference({
    name: 'show',
    key: 'newsgenerator.briefing-show',
    fallback: DEFAULT_SHOW,
    parse: (text) => PRESETS.some(preset => preset.value === text) ? text : undefined,
});
export const keptShow = () => showPreference.kept();
export const keepShow = (value) => showPreference.keep(value);
