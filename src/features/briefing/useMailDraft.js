//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: useMailDraft.js
//  Description: The e-mail the reader is writing from the stories they ticked: their order, what each carries (title, sentences,
//               picture, countries, the blocks), the colours and the address. One draft for the two layouts of the editor
//               (see MailEditor and MailMatrix); what it sends is built here, for the e-mail and for its preview
//

import {useEffect, useMemo, useState} from "react";
import {aiFirstPreference} from "@/features/briefing/aiFirst.js";
import {FORMATS} from "@/features/briefing/formats.js";
import {DEFAULT_BLOCKS, hasBlock, SERVER_BLOCKS, startingChoices} from "@/features/briefing/mailBlocks.js";
import {useBlocks} from "@/features/briefing/blockPresets.js";
import {bestPicture, fileBytes, MAX_FILES_BYTES, sentPicture, shownPicture, tooSmall, usePictureSizes} from "@/features/briefing/mailPictures.js";
import {usePreference} from "@/features/preferences/usePreference.js";

// one address, as the server checks it (server/services/utils/account-rules.js)
const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

export const two = (number) => String(number).padStart(2, '0');

// the AI version of a story in the way of the e-mail, null when it has none (the key passages have none)
export const aiTextOf = (story, way) => way === 'points' ? (story.ai?.points?.length ? story.ai.points : null)
    : way === 'digest' ? story.ai?.summary ?? null : null;
// the sentences of the article the e-mail sends in that way instead, translated when it has a translation;
// its key passages for a card written before the other ways (12.10.2026), as the server does
const paragraphsOf = (text) => String(text ?? '').split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean);
const ownTextOf = (story, way) => paragraphsOf(story.own?.[way] || story.own?.passages);
// the sentences as the reader changes them: a point a line, the paragraphs of a summary or of key
// passages a blank line between two (the user, 20.10.2026: the three ways can be changed)
export const WAY_NAMES = Object.fromEntries(FORMATS.map(format => [format.value, format.label.toLowerCase()]));
export const editable = (paragraphs, way) => paragraphs.join(way === 'points' ? '\n' : '\n\n');
const written = (text, way) => String(text ?? '').split(way === 'points' ? /\n+/ : /\n\s*\n/)
    .map(paragraph => paragraph.replace(/\s+/g, ' ').trim()).filter(Boolean);

// "2 angles taken out", "1 denial taken out", "1 official source taken out", "1 name taken out", "2 analysis lines taken
// out", or nothing (see MailAside)
export const takenOut = (removed = {}) => [
    [removed.contested?.length ?? 0, 'denial', 'denials'],
    [removed.angles?.length ?? 0, 'angle', 'angles'],
    [removed.official?.length ?? 0, 'official source', 'official sources'],
    [removed.names?.length ?? 0, 'name', 'names'],
    [(removed.why?.length ?? 0) + (removed.next?.length ?? 0) + (removed.timeline?.length ?? 0), 'analysis line', 'analysis lines'],
].filter(([count]) => count > 0).map(([count, one, many]) => `${count} ${count === 1 ? one : many} taken out`).join(' · ');

// stories: the cards ticked, in the order of the briefing (see MailBar); format: the way the page shows the sentences of the cards, the one
// of the e-mail until the reader chooses another, null for a briefing that has the key passages only; onPictures(storyId): {pictures};
// onWriteAi(storyId): the AI version of a story that has none, written now (see AiVersionWriter); onProfilesNews(): the news of the briefings of the other profiles, onCopyNews(fromBriefingId, storyId): one of them copied into the briefing,
// ticked, answering {storyId, title, source, similar} (null when refused): the editor then offers to import one (see MailImport);
// onFoldNews(keep, drop): two cards of the same news made one, true when done (see MailSameNews)
export const useMailDraft = ({stories, accountEmail, format = null, onPictures, onWriteAi, onProfilesNews, onCopyNews, onFoldNews}) => {
    const [to, setTo] = useState(null);         // null: the editor is closed, the address is not asked yet
    const [way, setWay] = useState(format);     // the way the sentences are shown in the e-mail
    const [order, setOrder] = useState([]);     // the storyIds in the order of the e-mail
    const [choices, setChoices] = useState({}); // storyId -> the picture chosen (see MailPicture)
    const [titles, setTitles] = useState({});   // storyId -> the title written for the e-mail
    const [whys, setWhys] = useState({});         // storyId -> the description (the sentence under the title) written for the e-mail, '' for none
    const [removed, setRemoved] = useState({}); // storyId -> {contested, angles, official, why, next, timeline}: the places taken out
    const [inAi, setInAi] = useState({});       // storyId -> true or false: what the reader chose for it, else the settings' (aiFirst)
    const [aiFirst] = usePreference(aiFirstPreference);
    const {list: startList} = useBlocks('mail');            // the blocks the editor opens with: the list of the e-mail the reader ticked in the settings
    const [texts, setTexts] = useState({});     // storyId -> {way: the sentences as the reader changes them}
    const [countries, setCountries] = useState({});     // storyId -> the country codes chosen, when they are not the ones found
    const [blocks, setBlocks] = useState({});           // storyId -> the blocks changed (see mailBlocks.js)
    const [theme, setTheme] = useState('light');        // the colours of the e-mail
    const [galleries, setGalleries] = useState({});     // storyId -> its pictures, null while asked
    const [selected, setSelected] = useState('all');    // the storyId the reader is changing, or 'all' for every story
    const [error, setError] = useState(null);
    const [picturesError, setPicturesError] = useState(null);
    const byId = new Map(stories.map(story => [story.storyId, story]));
    // a story unticked meanwhile leaves the e-mail
    const ordered = order.filter(storyId => byId.has(storyId)).map(storyId => byId.get(storyId));
    // the picture of a story the reader did not change is put aside when it is too small (see
    // MIN_PICTURE_WIDTH): the best other of the story instead, else none
    const sizes = usePictureSizes([...ordered.map(story => story.thumbnail), ...Object.values(galleries).flatMap(found => (found ?? []).map(picture => picture.url))]);
    const choiceOf = (story) => {
        if (choices[story.storyId] !== undefined) return choices[story.storyId];
        if (!tooSmall(sizes, story.thumbnail)) return undefined;
        const best = bestPicture(galleries[story.storyId] ?? [], sizes);
        return best ? {kind: 'url', url: best, auto: true} : {kind: 'none', small: true};
    };

    const open = () => {
        // the blocks ticked in the settings: on for every story that has them, off for the others
        const starting = startingChoices(stories, startList);
        setOrder(stories.map(story => story.storyId));
        setChoices(starting.choices);
        setTitles({});
        setWhys({});
        setRemoved({});
        setInAi({});
        setTexts({});
        setCountries(starting.countries);
        setBlocks(starting.blocks);
        setTheme('light');
        setSelected('all');
        setWay(format);
        setError(null);
        setPicturesError(null);
        setTo(accountEmail ?? '');
    };

    // one place up (-1) or down (+1) in the e-mail
    const move = (at, by) => {
        const next = ordered.map(story => story.storyId);
        [next[at], next[at + by]] = [next[at + by], next[at]];
        setOrder(next);
    };

    // the pictures of the story asked once, its own among them even when the server did not answer
    const loadGallery = async (story) => {
        if (story.storyId in galleries) return;
        setGalleries(current => ({...current, [story.storyId]: null}));
        const answer = await Promise.resolve().then(() => onPictures?.(story.storyId)).catch(() => null);
        const found = Array.isArray(answer?.pictures) ? answer.pictures : [];
        const own = story.thumbnail && !found.some(picture => picture.url === story.thumbnail)
            ? [{url: story.thumbnail, source: story.thumbnailSource ?? ''}] : [];
        setGalleries(current => ({...current, [story.storyId]: [...own, ...found]}));
    };

    // a story chosen to be changed: its pictures are asked then
    const select = (target) => {
        setSelected(target);
        if (target !== 'all') loadGallery(byId.get(target));
    };

    // A news of another profile imported while the editor is open (see MailImport): copied into the briefing and ticked by the page, then put at
    // the end of the e-mail and chosen, so that the reader can change it at once; {storyId, title, source, similar}, null when it was refused. Its
    // pictures are asked as soon as it is the one chosen and the page has it
    const importNews = async (fromBriefingId, storyId) => {
        const added = await onCopyNews?.(fromBriefingId, storyId);
        if (!added) return null;
        setOrder(current => current.includes(added.storyId) ? current : [...current, added.storyId]);
        setSelected(added.storyId);
        return added;
    };
    // Two cards of the same news made one, the reader keeping the card 'keep' (see MailSameNews): in the e-mail it takes the place of the first of
    // the two, the other is gone with its changes; true when done
    const foldNews = async (keep, drop) => {
        if (!await onFoldNews?.(keep, drop)) return false;
        setOrder(current => {
            const at = current.findIndex(id => id === keep || id === drop);
            if (at < 0) return current;
            const rest = current.filter(id => id !== keep && id !== drop);
            rest.splice(at, 0, keep);
            return rest;
        });
        setSelected(keep);
        return true;
    };
    useEffect(() => {
        const story = selected === 'all' ? null : byId.get(selected);
        if (story) loadGallery(story);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once a story is chosen and the page has it
    }, [selected, byId.has(selected)]);

    // the pictures of a story whose own is too small, to find a better one
    const small =ordered.filter(story => tooSmall(sizes, story.thumbnail) && !(story.storyId in galleries)).map(story => story.storyId).join(',');
    useEffect(() => {
        if (small) small.split(',').forEach(storyId => loadGallery(byId.get(Number(storyId))));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once per story found too small
    }, [small]);

    // the title the reader wrote, when it is not the one of the card
    const ownTitle = (story) => {
        const title = (titles[story.storyId] ?? '').replace(/\s+/g, ' ').trim();
        return title && title !== story.title ? title : null;
    };
    const setTitle = (storyId, title) => setTitles(current => ({...current, [storyId]: title}));

    // The description the reader wrote, when it is not the card's: the text, '' when they cleared it (none is sent), else null. The card's own (the reason it was
    // chosen for the reader) goes to the reader's address only: to another address the e-mail has what the reader wrote, or none (the user, 11.11.2026, a friend: the
    // description could not be changed in the editor)
    const ownWhy = (story) => {
        const text = whys[story.storyId];
        if (text === undefined) return null;
        const own = text.replace(/\s+/g, ' ').trim();
        return own === (story.why ?? '').replace(/\s+/g, ' ').trim() ? null : own;
    };
    const setWhy = (storyId, text) => setWhys(current => ({...current, [storyId]: text}));
    // whether the e-mail goes to another address than the reader's: it has no reason of the card then (see ownWhy)
    const toOther = EMAIL.test((to ?? '').trim()) && (to ?? '').trim().toLowerCase() !== String(accountEmail ?? '').trim().toLowerCase();

    // the way the e-mail sends the sentences in: the key passages for a briefing that has them only
    const shown = way ?? 'passages';
    // whether a story is sent in its AI version: what the reader chose, else the settings' (on at first), when it has one in that way
    const aiOn = (story) => Boolean(inAi[story.storyId] ?? aiFirst) && Boolean(aiTextOf(story, way));
    // the sentences the e-mail sends of a story when the reader does not change them: its AI version when
    // asked for, else the article's own
    const sentOf = (story) => aiOn(story) ? [aiTextOf(story, way)].flat() : ownTextOf(story, shown);
    // the sentences the reader wrote, when they are not the ones it would send; left empty, its own
    const ownText = (story) => {
        const text = texts[story.storyId]?.[shown];
        if (text === undefined) return null;
        const paragraphs = written(text, shown);
        return paragraphs.length > 0 && paragraphs.join('\n') !== sentOf(story).join('\n') ? paragraphs : null;
    };
    const writeText = (storyId, text) => setTexts(current => ({...current, [storyId]: {...current[storyId], [shown]: text}}));
    const setAi = (storyId, on) => {
        // the text shown is the version ticked, the one changed put aside
        setInAi(current => ({...current, [storyId]: on}));
        writeText(storyId, undefined);
    };

    // the countries the e-mail shows for a story: the ones the reader chose, else the ones found, whatever its title says (the user,
    // 06.11.2026); the ones found again, or null, are no choice
    const countriesOf = (story) => countries[story.storyId] ?? story.countries ?? [];
    const chooseCountries = (story, codes) => setCountries(current => {
        const next = {...current};
        const found = story.countries ?? [];
        if (codes === null || (codes.length === found.length && codes.every(code => found.includes(code)))) delete next[story.storyId];
        else next[story.storyId] = codes;
        return next;
    });

    const choose = (storyId, choice) => setChoices(current => {
        const next = {...current};
        if (choice === undefined) delete next[storyId];
        else next[storyId] = choice;
        return next;
    });

    const setRemovedOf = (storyId, next) => setRemoved(current => ({...current, [storyId]: next}));

    // the blocks of a story as they stand: the ones the server takes, with the ones the reader changed
    const blocksOf = (story) => ({...DEFAULT_BLOCKS, ...blocks[story.storyId]});
    // is the block on for this story: the picture and the countries are the choices made of them, the others the blocks
    const isOn = (story, key) => {
        if (key === 'picture') return choiceOf(story)?.kind !== 'none' && Boolean(story.thumbnail || choiceOf(story));
        if (key === 'countries') return countriesOf(story).length > 0;
        return Boolean(blocksOf(story)[key]);
    };
    // the block put on or off for these stories (those that have it; the countries the reader added by hand count as found)
    const setBlock = (targets, key, on) => {
        const list = targets.filter(story => hasBlock(story, key) || (key === 'countries' && countriesOf(story).length > 0));
        if (key === 'picture') list.forEach(story => choose(story.storyId, on ? undefined : {kind: 'none'}));
        else if (key === 'countries') list.forEach(story => chooseCountries(story, on ? null : []));
        else setBlocks(current => Object.fromEntries([...Object.entries(current), ...list.map(story => [story.storyId, {...DEFAULT_BLOCKS, ...current[story.storyId], [key]: on}])]));
    };
    // what is said of a story in the list of the e-mail: its place in the briefing and what the reader changed in it
    const noteOf = (story) => {
        const choice = choiceOf(story);
        return [
            `${two(story.number)} in the briefing`,
            ownTitle(story) && 'title changed',
            ownWhy(story) !== null && 'description changed',
            ownText(story) && `${WAY_NAMES[shown]} changed`,
            countries[story.storyId] && 'countries changed',
            choice?.kind === 'none' && (choice.small ? 'its picture too small, left out' : 'no picture'),
            choice?.auto && 'its picture too small, a sharper one of the story instead',
            choice && choice.kind !== 'none' && !choice.auto && 'picture changed',
            takenOut(removed[story.storyId]),
            aiOn(story) && 'AI version',
        ].filter(Boolean).join(' · ');
    };

    // what is sent, for the e-mail and for its preview: the stories in order, the pictures, titles and descriptions changed, what is taken out, the way,
    // the AI versions, the sentences written, the countries chosen, the colours and the blocks of each story
    const payload = useMemo(() => {
        const sent = ordered.filter(story => choiceOf(story) !== undefined);
        return {
            storyIds: ordered.map(story => story.storyId),
            pictures: Object.fromEntries(sent.map(story => [story.storyId, sentPicture(choiceOf(story))])),
            titles: Object.fromEntries(ordered.map(story => [story.storyId, ownTitle(story)]).filter(([, title]) => title)),
            descriptions: Object.fromEntries(ordered.map(story => [story.storyId, ownWhy(story)]).filter(([, text]) => text !== null)),
            removed: Object.fromEntries(ordered.filter(story => takenOut(removed[story.storyId])).map(story => [story.storyId, removed[story.storyId]])),
            way: way ?? undefined,
            ai: ordered.filter(aiOn).map(story => story.storyId),
            texts: Object.fromEntries(ordered.map(story => [story.storyId, ownText(story)]).filter(([, paragraphs]) => paragraphs)),
            countries: Object.fromEntries(ordered.filter(story => countries[story.storyId]).map(story => [story.storyId, countries[story.storyId]])),
            theme,
            blocks: Object.fromEntries(ordered.map(story => [story.storyId, blocksOf(story)])),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the states it is made of
    }, [ordered.map(story => story.storyId).join(','), choices, sizes, galleries, titles, whys, removed, way, inAi, aiFirst, texts, countries, theme, blocks]);

    // the e-mail sent: the address checked, the weight of the images too; onSend(address, payload) answers true when it went
    const submit = async (event, onSend) => {
        event.preventDefault();
        const address = (to ?? '').trim();
        if (!EMAIL.test(address)) {
            setError('An email, like name@example.org');
            return;
        }
        const files = ordered.filter(story => choiceOf(story) !== undefined).reduce((sum, story) => sum + fileBytes(choiceOf(story)), 0);
        if (files > MAX_FILES_BYTES) {
            setPicturesError(`Your images weigh ${MAX_FILES_BYTES / 1024 / 1024} MB at most together: take one out, or use its address.`);
            return;
        }
        setError(null);
        setPicturesError(null);
        if (await onSend(address, payload)) setTo(null);
    };

    return {
        to, setTo, way, setWay, theme, setTheme, ordered, count: stories.length, selected, select, move, open, close: () => setTo(null),
        noteOf, choiceOf, choose, galleries, titles, setTitle, ownTitle, whys, setWhy, ownWhy, toOther, removed, setRemovedOf, aiOn, setAi, texts, shown, sentOf, ownText, writeText,
        countries, countriesOf, chooseCountries, blocksOf, isOn, setBlock, payload, submit, error, picturesError, shownPicture,
        writeAi: onWriteAi, canImport: Boolean(onProfilesNews && onCopyNews), profilesNews: onProfilesNews, importNews, canFold: Boolean(onFoldNews), foldNews,
    };
};
