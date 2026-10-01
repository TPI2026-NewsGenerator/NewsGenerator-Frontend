//
//  Author: Fabian Rostello
//  Date: 22.09.2026
//  File: UserFeeds.jsx
//  Description: Sources added by the user, read for their briefing and their searches, only for them
//

import {useEffect, useRef, useState} from "react";
import {FaRegStar, FaShareAlt, FaStar, FaTrash} from "react-icons/fa";
import {Button, IconButton} from "@/components/ui/button.jsx";
import {Checkbox, Help, Input, Label, Select} from "@/components/ui/field.jsx";
import {Meta, MetaLine, Working} from "@/components/ui/text.jsx";
import {toast} from "@/lib/toast.js";
import {feedAddress} from "@/lib/utils.js";
import {ImportSources} from "@/features/briefing/components/ImportSources.jsx";

// categories: of 'language', the one of the site added. languages: [{value, label}], when given the
// reader picks it here and onLanguage is told. origin: 'user' lists only the sources added by hand.
// onChanged: told when sources were added or removed (the languages the reader can choose follow them)
export const UserFeeds = ({token, categories, api, reloadKey, language = 'en', languages, onLanguage, origin, onChanged}) => {
    const [feeds, setFeeds] = useState([]);
    const [site, setSite] = useState('');
    const [category, setCategory] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    // search of sources: the directory answers in a second, the web half a minute later and completes
    // the same list. searched: the words of the last search, its results, and the ones ticked
    const [query, setQuery] = useState('');
    const [searched, setSearched] = useState('');
    const [found, setFound] = useState(null);
    const [selected, setSelected] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchingWeb, setIsSearchingWeb] = useState(false);
    const lastSearch = useRef(0);       // a search started meanwhile replaces the answers of this one

    useEffect(() => {
        if (!token) return;

        api.getUserFeeds(token)
            .then(data => setFeeds(data.feeds ?? []))
            .catch(e => console.error("Failed to fetch sources", e));
    }, [token, api, reloadKey]);

    const needCategory = () => {
        if (category) return true;
        toast.error('Pick a category first.');
        return false;
    };

    const handleAdd = async () => {
        if (!site.trim()) {
            toast.error('Enter a website.');
            return;
        }
        if (!needCategory()) return;

        setIsAdding(true);
        const data = await api.addUserFeed({site: site.trim(), category, language}, token);
        setIsAdding(false);

        if (!data || data.error) {
            toast.error(data?.error ?? "This source could not be added.");
            return;
        }

        setFeeds([data.feed, ...feeds]);
        onChanged?.();
        setSite('');
        toast.success(`${data.feed.site} added, e.g. "${data.sample?.[0]}"`);
    };

    const handleSearch = async () => {
        if (!query.trim()) {
            toast.error('Enter a site, a feed or a subject, like "premier league".');
            return;
        }

        const words = query.trim();
        const search = ++lastSearch.current;
        setSearched(words);
        setFound(null);
        setSelected([]);
        setIsSearching(true);
        setIsSearchingWeb(true);

        // a medium both of them name is listed once, as the directory names it
        const merge = (first, then) => {
            const seen = new Set(first.flatMap(source => [source.site, source.feed]));
            return [...first, ...then.filter(source => !seen.has(source.site) && !seen.has(source.feed))];
        };
        const ask = (from) => api.searchSources(words, token, language, from).catch(() => null);

        const web = ask('web').then(data => {
            if (search !== lastSearch.current) return;
            setIsSearchingWeb(false);
            if (data?.sources) setFound(current => merge(current ?? [], data.sources));
        });

        const directory = await ask('directory');
        if (search !== lastSearch.current) return;
        setIsSearching(false);
        if (!directory || directory.error) {
            toast.error(directory?.error ?? "The directory could not be searched.");
            setFound(current => current ?? []);
        } else {
            // the web may have answered first: the directory goes on top all the same
            setFound(current => merge(directory.sources ?? [], current ?? []));
        }
        await web;
    };

    const handleAddFound = async () => {
        if (!needCategory()) return;

        const chosen = found
            .filter(source => selected.includes(source.feed))
            .map(source => ({site: source.site, feed: source.feed, category}));

        setIsAdding(true);
        // the media found on the web are read on their section about these words, when they have one
        const fromWeb = found.some(source => source.via === 'web' && selected.includes(source.feed));
        const data = await api.importSources(chosen, token, language, fromWeb ? [searched] : null);
        setIsAdding(false);

        if (!data || data.error) {
            toast.error(data?.error ?? "These sources could not be added.");
            return;
        }

        const done = (data.feeds ?? []).map(feed => feed.url);
        if (done.length > 0) {
            toast.success(`${done.length} source${done.length > 1 ? 's' : ''} added.`);
        }
        for (let failed of data.errors ?? []) {
            toast.error(`${failed.site}: ${failed.error}`);
        }

        setFeeds([...(data.feeds ?? []), ...feeds]);
        if (done.length > 0) onChanged?.();
        setFound(found.filter(source => !done.includes(source.feed)));
        setSelected(selected.filter(feed => !done.includes(feed)));
    };

    // trusted: among the stories close to the profile, the ones it tells come first
    // shared: it can be recommended to the other readers whose interests it publishes on
    const handleChange = async (feed, changes) => {
        const data = await api.updateFeed(feed.id, changes, token);

        if (!data || data.error) {
            toast.error(data?.error ?? "This source could not be changed.");
            return;
        }

        setFeeds(feeds.map(other => other.id === feed.id ? {...other, trusted: data.trusted, shared: data.shared} : other));
    };

    const handleDelete = async (feed) => {
        const data = await api.deleteUserFeed(feed.id, token);

        if (!data || data.error) {
            toast.error(data?.error ?? "This source could not be removed.");
            return;
        }

        setFeeds(feeds.filter(other => other.id !== feed.id));
        onChanged?.();
    };

    const listed = origin ? feeds.filter(feed => (feed.origin ?? 'user') === origin) : feeds;

    const onEnter = (action) => (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            action();
        }
    };

    return (
        <div className="space-y-8">
            <div className="grid-12 items-end gap-y-4">
                <div className={`col-span-12 ${languages ? 'sm:col-span-4' : 'sm:col-span-6'}`}>
                    <Label htmlFor="own-site">Add a website</Label>
                    <Input id="own-site" value={site} onChange={event => setSite(event.target.value)} placeholder="e.g., engadget.com"
                           onKeyDown={onEnter(handleAdd)} disabled={isAdding}/>
                </div>
                {languages && (
                    <div className="col-span-6 sm:col-span-3">
                        <Label htmlFor="own-language">Its language</Label>
                        <Select id="own-language" options={languages} value={language}
                                onChange={event => {
                                    setCategory('');
                                    onLanguage?.(event.target.value);
                                }}/>
                    </div>
                )}
                <div className={languages ? 'col-span-6 sm:col-span-3' : 'col-span-8 sm:col-span-4'}>
                    <Label htmlFor="own-category">Category</Label>
                    <Select id="own-category" placeholder="Category" value={category} onChange={event => setCategory(event.target.value)}
                            options={categories.map(name => ({value: name, label: name}))}/>
                </div>
                <div className={languages ? 'col-span-12 sm:col-span-2' : 'col-span-4 sm:col-span-2'}>
                    <Button className="w-full" onClick={handleAdd} loading={isAdding}>Add</Button>
                </div>

                <div className="col-span-8 sm:col-span-10">
                    <Label htmlFor="own-query">Or search a site, a feed or a subject</Label>
                    <Input id="own-query" value={query} onChange={event => setQuery(event.target.value)} aria-describedby="own-query-help"
                           placeholder='e.g., "lequipe", "premier league", "rugby top 14"' onKeyDown={event => onEnter(handleSearch)(event)} disabled={isSearching}/>
                    <Help id="own-query-help">
                        A directory of feeds is searched by their names, and the web for the media that published on
                        these words lately. A subject you want to follow belongs in your own words, above: sources are
                        found for it.
                    </Help>
                </div>
                <div className="col-span-4 sm:col-span-2">
                    <Button className="w-full" onClick={handleSearch} loading={isSearching}>Search</Button>
                </div>
            </div>

            {isSearching && <Working>Searching the directory…</Working>}
            {!isSearching && isSearchingWeb && (
                <Working>Looking on the web for the media publishing on it: about half a minute…</Working>
            )}

            {!isSearching && !isSearchingWeb && found !== null && found.length === 0 && (
                <p className="caption">
                    No feed is named "{searched}", and no medium you don't read yet published on it lately with a feed
                    we could find.
                </p>
            )}

            {found !== null && found.length > 0 && (
                <div className="border-t border-rule pt-4">
                    <p className="caption">
                        {found.length} source{found.length > 1 ? 's' : ''}: the feeds named so, the most read first, then
                        the media that published on it lately, the most present first. They are checked when added.
                    </p>
                    <div className="mt-3 flex flex-col">
                        {found.map(source => (
                            <Checkbox key={source.feed} checked={selected.includes(source.feed)}
                                      onChange={event => setSelected(event.target.checked
                                          ? [...selected, source.feed]
                                          : selected.filter(feed => feed !== source.feed))}>
                                <span className="font-semibold">{source.name}</span>{' '}
                                <MetaLine className="inline-flex">
                                    {source.via === 'web'
                                        ? <Meta tone="ink">{source.news} news on it</Meta>
                                        : <Meta>{source.readers} readers</Meta>}
                                    {source.language && <Meta>{source.language}</Meta>}
                                    <Meta>{source.site}</Meta>
                                </MetaLine>
                                {source.sample && <span className="caption block">e.g. “{source.sample}”</span>}
                            </Checkbox>
                        ))}
                    </div>
                    <Button variant="primary" size="sm" className="mt-4" onClick={handleAddFound}
                            loading={isAdding} disabled={selected.length === 0}>
                        Add {selected.length} source{selected.length > 1 ? 's' : ''}
                    </Button>
                </div>
            )}

            <ImportSources token={token} api={api} language={language} category={category} needCategory={needCategory}
                           onAdded={added => {
                               setFeeds(current => [...added, ...current]);
                               onChanged?.();
                           }}/>

            {listed.length === 0
                ? <p className="caption">No source of your own yet. The feed of the site is found automatically.</p>
                : (
                    <ul className="border-t border-rule">
                        {listed.map(feed => (
                            <li key={feed.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule py-2.5">
                                {/* any source, one found for the profile too: it is then never removed */}
                                <IconButton label={feed.trusted ? `Stop trusting ${feed.site}` : `Trust ${feed.site}`}
                                            pressed={Boolean(feed.trusted)}
                                            title={feed.trusted
                                                ? 'Trusted: its stories come first in your briefing when they fit your interests, and it is never removed'
                                                : 'Trust this source: its stories will come first in your briefing when they fit your interests'}
                                            onClick={() => handleChange(feed, {trusted: !feed.trusted})}>
                                    {feed.trusted ? <FaStar/> : <FaRegStar/>}
                                </IconButton>
                                {feed.origin !== 'profile' && (
                                    <IconButton label={feed.shared ? `Stop sharing ${feed.site}` : `Share ${feed.site}`}
                                                pressed={Boolean(feed.shared)}
                                                title={feed.shared
                                                    ? 'Shared: it can be recommended to the other readers who follow its subjects'
                                                    : 'Share this source: it can be recommended to the other readers who follow its subjects. Nobody sees it otherwise'}
                                                onClick={() => handleChange(feed, {shared: !feed.shared})}>
                                        <FaShareAlt/>
                                    </IconButton>
                                )}
                                <span className="min-w-0 flex-1 font-semibold [overflow-wrap:anywhere]">{feed.site}</span>
                                <Meta>{feed.category}</Meta>
                                {feed.error && <Meta tone="accent" title={feed.error}>not working</Meta>}
                                <span className="caption hidden max-w-[40%] truncate md:inline" title={feedAddress(feed.url)}>{feedAddress(feed.url)}</span>
                                <IconButton label={`Remove ${feed.site}`} className="hover:text-accent-ink" onClick={() => handleDelete(feed)}>
                                    <FaTrash/>
                                </IconButton>
                            </li>
                        ))}
                    </ul>
                )}
        </div>
    );
};
