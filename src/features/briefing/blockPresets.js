//
//  Author: Fabian Rostello
//  Date: 06.11.2026
//  File: blockPresets.js
//  Description: What a story carries, as the reader sets it in the settings: ONE list of blocks for the e-mail and ONE for the page of the
//               briefing (the user, 10.11.2026: the three presets "Short", "Standard" and "Everything" are gone, a friend of the user uses a single
//               mode; the blocks stay ticked in the settings). The editor of the e-mail opens with the list of the e-mail, the cards of the page
//               show the list of the page. Kept in the browser and on the account (see features/preferences). The presets of before 06.11.2026
//               are still read, to carry over what a reader had set: see legacyList
//

import {useMemo} from "react";
import {BLOCKS, DEFAULT_BLOCKS, PRESETS, SERVER_BLOCKS} from "@/features/briefing/mailBlocks.js";
import {preference} from "@/features/preferences/preferences.js";
import {usePreference} from "@/features/preferences/usePreference.js";

const ORDER = BLOCKS.map(block => block.key);
const same = (a, b) => a.length === b.length && a.every(key => b.includes(key));

// What the reader kept ('' or the JSON of an array of blocks) as the list there is, in the order of the blocks, the unknown ones dropped; undefined
// when it is no array at all
const keptList = (raw) => {
    let kept;
    try {
        kept = JSON.parse(raw || 'null');
    } catch {
        return undefined;
    }
    return Array.isArray(kept) ? ORDER.filter(key => kept.includes(key)) : undefined;
};

// the list of blocks of each place, one each: the e-mail, and the page of the briefing
export const BLOCK_LISTS = {
    mail: preference({name: 'mailBlocks', key: 'newsgenerator.mail-blocks', fallback: undefined, parse: keptList, serialize: JSON.stringify}),
    page: preference({name: 'pageBlocks', key: 'newsgenerator.page-blocks', fallback: undefined, parse: keptList, serialize: JSON.stringify}),
};

// What a reader who chose nothing has: the e-mail opens with everything but the affair and its coverage, as it always opened; the page shows the whole
// card, as it always showed it
export const DEFAULT_LISTS = {
    mail: ['picture', 'countries', ...SERVER_BLOCKS.filter(key => DEFAULT_BLOCKS[key])],
    page: ORDER,
};

// ---- the presets of before 10.11.2026, read only to carry over what a reader set: their lists are still kept on the account

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

// the two places that had presets, each its own: the e-mail, and the page of the briefing
export const SCOPES = {
    mail: preference({name: 'mailPresets', key: 'newsgenerator.mail-presets', fallback: {}, parse: keptLists, serialize: JSON.stringify}),
    page: preference({name: 'pagePresets', key: 'newsgenerator.page-presets', fallback: {}, parse: keptLists, serialize: JSON.stringify}),
};

// the preset the page showed its cards in: the one the reader chose last, "Everything" at first
const DEFAULT_SHOW = 'everything';
export const showPreference = preference({
    name: 'show',
    key: 'newsgenerator.briefing-show',
    fallback: DEFAULT_SHOW,
    parse: (text) => PRESETS.some(preset => preset.value === text) ? text : undefined,
});

// The list a reader who set presets before has, as long as they choose none: for the page, the preset it showed with the blocks they ticked for
// it; for the e-mail, the one of the presets they changed ("Everything" first: the one that had the most), else what the editor always opened with
const legacyList = (scope, presets, show) => {
    const lists = presetsOf(presets);
    if (scope === 'page') return lists.find(preset => preset.value === show)?.on ?? DEFAULT_LISTS.page;
    return ['everything', 'standard', 'short'].map(value => lists.find(preset => preset.value === value)).find(preset => preset?.changed)?.on ?? DEFAULT_LISTS.mail;
};

// ---- the list of a place, and the ways to change it

// The blocks of a place ('mail' or 'page'): list, the blocks ticked (the reader's, else what they had before, else what there is at first);
// isOn(block); set(block, on) puts a block in or out; reset() puts the list back as it is at first; changed, whether it is not the one at first.
// Every place that reads it is told at once
export const useBlocks = (scope) => {
    const [chosen, keep] = usePreference(BLOCK_LISTS[scope]);
    const [presets] = usePreference(SCOPES[scope]);
    const [show] = usePreference(showPreference);
    const list = useMemo(() => chosen ?? legacyList(scope, presets, show), [chosen, presets, show, scope]);
    const first = DEFAULT_LISTS[scope];
    return {
        list,
        changed: !same(list, first),
        isOn: (block) => list.includes(block),
        set: (block, on) => keep(ORDER.filter(key => (key === block ? on : list.includes(key)))),
        reset: () => keep(first),
    };
};
