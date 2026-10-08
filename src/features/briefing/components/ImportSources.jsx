//
//  Author: Fabian Rostello
//  Date: 01.10.2026
//  File: ImportSources.jsx
//  Description: A list of sites the reader imports from a file of theirs (Excel, CSV, OPML or text):
//               its addresses are read here, the server finds the feed of each, the reader chooses
//

import {useRef, useState} from "react";
import {Button} from "@/components/ui/button.jsx";
import {Checkbox} from "@/components/ui/field.jsx";
import {Meta, MetaLine, Notice, Working} from "@/components/ui/text.jsx";
import {toast} from "@/lib/toast.js";
import {addressesOfFile} from "@/features/briefing/importFile.js";
import {languageLabel} from "@/features/briefing/profileWords.js";

const CHECKED_AT_ONCE = 25;     // the server takes 25 sites a request, about 15 seconds
const ADDED_AT_ONCE = 50;
const ACCEPT = '.xlsx,.xlsm,.csv,.tsv,.txt,.opml,.xml';

// what each status tells the reader, and whether it is ticked from the start
const STATUS = {
    ready: {label: 'feed', ticked: true},
    bridge: {label: 'no feed: read from its page', ticked: false,
        title: 'The site publishes no feed: its page is read instead, which costs far more. You can have a few of those, see the limit when adding'},
    flood: {label: 'heavy', ticked: false, title: 'Its feed holds hundreds of news at once: an archive, or a flood of short notes'},
    asleep: {label: 'quiet', ticked: false, title: 'Fewer than 3 news in the last 7 days'},
};

// The sites of a list leading to one feed (the same key: "kicker.de" and "kicker.de/news") are one
// line, the first one, the others named under it (also): added once, never refused as a source added
// already. A site without a feed has no key, each stays
const joined = (previous, sites) => {
    const next = [...previous];
    for (const site of sites) {
        const at = site.key ? next.findIndex(other => other.key === site.key) : -1;
        if (at < 0) next.push(site);
        else next[at] = {...next[at], also: [...(next[at].also ?? []), site.site]};
    }
    return next;
};
const shortAddress = (site) => site.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

// category: the one the sources go to, chosen above. needCategory: says when it is missing
export const ImportSources = ({api, language, category, needCategory, onAdded}) => {
    const [fileName, setFileName] = useState('');
    const [total, setTotal] = useState(0);
    const [results, setResults] = useState([]);
    const [selected, setSelected] = useState([]);
    const [isChecking, setIsChecking] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [failed, setFailed] = useState([]);
    const input = useRef(null);
    const run = useRef(0);      // a file picked meanwhile, or a stop, ends the check of this one

    const handleFile = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        let read;
        try {
            read = await addressesOfFile(file);
        } catch (error) {
            toast.error(error.message);
            return;
        }
        if (read.addresses.length === 0) {
            toast.error(`No address of a website in ${file.name}.`);
            return;
        }
        if (read.more > 0) {
            toast.error(`${read.more} more addresses were left out: ${read.addresses.length} at most at once.`);
        }

        const current = ++run.current;
        setFileName(file.name);
        setTotal(read.addresses.length);
        setResults([]);
        setSelected([]);
        setFailed([]);
        setIsChecking(true);

        let collected = [];
        for (let start = 0; start < read.addresses.length; start += CHECKED_AT_ONCE) {
            const data = await api.checkSites(read.addresses.slice(start, start + CHECKED_AT_ONCE), language).catch(() => null);
            if (current !== run.current) return;
            if (!data || data.error) {
                toast.error(data?.error ?? 'The sites could not be checked.');
                break;
            }
            // a feed met before keeps its line, and its tick as the reader left it
            const fresh = data.sites.filter(site => STATUS[site.status]?.ticked && !collected.some(other => other.key === site.key));
            collected = joined(collected, data.sites);
            setResults(collected);
            setSelected(previous => [...new Set([...previous, ...fresh.map(site => site.key)])]);
        }
        setIsChecking(false);
    };

    const stop = () => {
        run.current++;
        setIsChecking(false);
    };

    const handleAdd = async () => {
        if (!needCategory()) return;

        const chosen = results
            .filter(result => STATUS[result.status] && selected.includes(result.key))
            .map(result => ({site: result.site, key: result.key, feed: result.feed, category}));

        setIsAdding(true);
        const added = [];
        const errors = [];
        const answered = [];        // sent and answered: added, or refused with a reason
        for (let start = 0; start < chosen.length; start += ADDED_AT_ONCE) {
            const part = chosen.slice(start, start + ADDED_AT_ONCE);
            // the key is for this list only, the server finds the feed of a site read from its page again
            const data = await api.importSources(part.map(({site, feed, category}) => ({site, feed, category})), language).catch(() => null);
            if (!data || data.error) {
                errors.push({site: `${chosen.length - start} sources`, error: data?.error ?? 'They could not be added.'});
                break;
            }
            answered.push(...part);
            added.push(...(data.feeds ?? []));
            errors.push(...(data.errors ?? []));
        }
        setIsAdding(false);

        if (added.length > 0) {
            toast.success(`${added.length} source${added.length > 1 ? 's' : ''} added.`);
            onAdded?.(added);
        }
        // the ones added leave the list (a site read from its page has no address here, the server
        // builds its feed again), the refused ones stay, with why
        const refused = new Set(errors.map(error => error.site));
        const done = new Set(answered.filter(source => !refused.has(source.site)).map(source => source.key));
        setResults(results.filter(result => !done.has(result.key)));
        setSelected(selected.filter(key => !done.has(key)));
        setFailed(errors);
    };

    const choosable = results.filter(result => STATUS[result.status]);
    const ready = choosable.filter(result => result.status === 'ready');
    const added = results.filter(result => result.status === 'added');
    const none = results.filter(result => result.status === 'none');
    const sharing = results.reduce((sum, result) => sum + (result.also?.length ?? 0), 0);
    const toggle = (key, on) => setSelected(on ? [...selected, key] : selected.filter(other => other !== key));

    return (
        <div className="border-t border-rule pt-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Button size="sm" onClick={() => input.current?.click()} disabled={isChecking}>Import a list</Button>
                <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={handleFile} aria-label="A file listing websites"/>
                <p className="caption">
                    A file of yours listing websites or feeds: Excel (.xlsx), CSV, OPML or text. Their addresses are
                    read in your browser, wherever they are in it, and the feed of each site is found.
                </p>
            </div>

            {isChecking && (
                <div className="mt-4 flex flex-wrap items-end gap-4">
                    <Working>Finding the feeds of {fileName}: {results.length} of {total} sites…</Working>
                    <Button size="sm" variant="subtle" onClick={stop}>Stop</Button>
                </div>
            )}

            {results.length > 0 && (
                <div className="mt-4">
                    <p className="caption">
                        {fileName}: {ready.length} feed{ready.length > 1 ? 's' : ''} ready, ticked
                        {choosable.length > ready.length && `, ${choosable.length - ready.length} more you can take`}
                        {added.length > 0 && `, ${added.length} already among your sources`}
                        {none.length > 0 && `, ${none.length} without a feed or page to read`}
                        {sharing > 0 && `, ${sharing} leading to a feed listed already`}.
                    </p>
                    {choosable.length > 0 && (
                        <>
                            <div className="mt-2 flex gap-2">
                                <Button size="sm" variant="link" onClick={() => setSelected(choosable.map(result => result.key))}>Tick all</Button>
                                <Button size="sm" variant="link" onClick={() => setSelected([])}>Tick none</Button>
                            </div>
                            <div className="mt-2 flex max-h-[28rem] flex-col overflow-y-auto">
                                {choosable.map(result => (
                                    <Checkbox key={result.key} checked={selected.includes(result.key)}
                                              onChange={event => toggle(result.key, event.target.checked)}>
                                        <span className="font-semibold [overflow-wrap:anywhere]">{result.name}</span>{' '}
                                        <MetaLine className="inline-flex">
                                            <Meta tone={result.status === 'ready' ? 'ink' : 'accent'} title={STATUS[result.status].title}>
                                                {STATUS[result.status].label}
                                            </Meta>
                                            {result.language && <Meta>{languageLabel(result.language)}</Meta>}
                                            {result.recent !== null && <Meta>{result.recent} news this week</Meta>}
                                        </MetaLine>
                                        {result.sample && <span className="caption block">e.g. “{result.sample}”</span>}
                                        {result.also?.length > 0 && (
                                            <span className="caption block [overflow-wrap:anywhere]">
                                                Same feed as {result.also.map(shortAddress).join(', ')} in your list
                                            </span>
                                        )}
                                    </Checkbox>
                                ))}
                            </div>
                            <Button variant="primary" size="sm" className="mt-4" onClick={handleAdd}
                                    loading={isAdding} disabled={selected.length === 0 || isChecking}>
                                Add {selected.length} source{selected.length > 1 ? 's' : ''}
                            </Button>
                        </>
                    )}
                    {none.length > 0 && (
                        <details className="mt-3">
                            <summary className="caption cursor-pointer">The {none.length} sites without a feed or a page to read</summary>
                            <ul className="caption mt-2">
                                {none.map(result => <li key={result.site} className="[overflow-wrap:anywhere]">{result.site}</li>)}
                            </ul>
                        </details>
                    )}
                </div>
            )}

            {failed.length > 0 && (
                <Notice type="error" title={`${failed.length} not added`} className="mt-4" onClose={() => setFailed([])}>
                    <ul>
                        {failed.slice(0, 10).map((error, i) => <li key={i}>{error.site}: {error.error}</li>)}
                    </ul>
                    {failed.length > 10 && <p className="caption">and {failed.length - 10} more.</p>}
                </Notice>
            )}
        </div>
    );
};
