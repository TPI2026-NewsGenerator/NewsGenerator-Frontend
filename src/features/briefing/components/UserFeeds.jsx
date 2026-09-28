//
//  Author: Fabian Rostello
//  Date: 22.09.2026
//  File: UserFeeds.jsx
//  Description: Sources added by the user, read for their briefing and their searches, only for them
//

import {useEffect, useState} from "react";
import {FaRegStar, FaShareAlt, FaStar, FaTrash} from "react-icons/fa";
import {Button, IconButton} from "@/components/ui/button.jsx";
import {Checkbox, Input, Label, Select} from "@/components/ui/field.jsx";
import {Meta, MetaLine} from "@/components/ui/text.jsx";
import {toast} from "@/lib/toast.js";
import {feedAddress} from "@/lib/utils.js";

// categories: of 'language', the one of the site added. languages: [{value, label}], when given the
// reader picks it here and onLanguage is told. origin: 'user' lists only the sources added by hand
export const UserFeeds = ({token, categories, api, reloadKey, language = 'en', languages, onLanguage, origin}) => {
    const [feeds, setFeeds] = useState([]);
    const [site, setSite] = useState('');
    const [category, setCategory] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    // search of the directory: the feeds found, and the ones ticked
    const [query, setQuery] = useState('');
    const [found, setFound] = useState(null);
    const [selected, setSelected] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

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
        setSite('');
        toast.success(`${data.feed.site} added, e.g. "${data.sample?.[0]}"`);
    };

    const handleSearch = async () => {
        if (!query.trim()) {
            toast.error('Enter a subject, like "premier league".');
            return;
        }

        setIsSearching(true);
        const data = await api.searchSources(query.trim(), token);
        setIsSearching(false);

        if (!data || data.error) {
            toast.error(data?.error ?? "The directory could not be searched.");
            return;
        }

        setFound(data.sources ?? []);
        setSelected([]);
    };

    const handleAddFound = async () => {
        if (!needCategory()) return;

        const chosen = found
            .filter(source => selected.includes(source.feed))
            .map(source => ({site: source.site, feed: source.feed, category}));

        setIsAdding(true);
        const data = await api.importSources(chosen, token, language);
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
                    <Label htmlFor="own-query">Or search the directory</Label>
                    <Input id="own-query" value={query} onChange={event => setQuery(event.target.value)}
                           placeholder='a subject, e.g., "premier league"' onKeyDown={onEnter(handleSearch)} disabled={isSearching}/>
                </div>
                <div className="col-span-4 sm:col-span-2">
                    <Button className="w-full" onClick={handleSearch} loading={isSearching}>Search</Button>
                </div>
            </div>

            {found !== null && found.length === 0 && (
                <p className="caption">No feed found for "{query}" outside the sources you already have.</p>
            )}

            {found !== null && found.length > 0 && (
                <div className="border-t border-rule pt-4">
                    <p className="caption">
                        {found.length} feed{found.length > 1 ? 's' : ''}, the most read first. They are checked when added.
                    </p>
                    <div className="mt-3 flex flex-col">
                        {found.map(source => (
                            <Checkbox key={source.feed} checked={selected.includes(source.feed)}
                                      onChange={event => setSelected(event.target.checked
                                          ? [...selected, source.feed]
                                          : selected.filter(feed => feed !== source.feed))}>
                                <span className="font-semibold">{source.name}</span>{' '}
                                <MetaLine className="inline-flex">
                                    <Meta>{source.readers} readers</Meta>
                                    {source.language && <Meta>{source.language}</Meta>}
                                    <Meta>{source.site}</Meta>
                                </MetaLine>
                            </Checkbox>
                        ))}
                    </div>
                    <Button variant="primary" size="sm" className="mt-4" onClick={handleAddFound}
                            loading={isAdding} disabled={selected.length === 0}>
                        Add {selected.length} source{selected.length > 1 ? 's' : ''}
                    </Button>
                </div>
            )}

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
