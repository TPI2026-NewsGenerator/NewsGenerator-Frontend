//
//  Author: Fabian Rostello
//  Date: 22.09.2026
//  File: SourceSuggestions.jsx
//  Description: What the search misses: the news of the media that are not in the sources, read
//               only, and those media to add in one click
//

import {useState} from "react";
import {Section} from "@/components/layout/Page.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Checkbox, Label, Select} from "@/components/ui/field.jsx";
import {Meta, MetaLine, Working} from "@/components/ui/text.jsx";
import {toast} from "@/lib/toast.js";
import {feedAddress} from "@/lib/utils.js";

// "2026-09-22T20:22:47.000Z" -> "2 hours ago", the news of a feed are dated the same way
const publishedAgo = (at) => {
    if (!at) return '';

    const minutes = Math.floor((Date.now() - new Date(at)) / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const format = new Intl.RelativeTimeFormat('en', {numeric: 'auto'});

    if (minutes < 60) return format.format(-minutes, 'minute');
    if (hours < 24) return format.format(-hours, 'hour');
    return format.format(-Math.floor(hours / 24), 'day');
};

// given a new key at each search: a new search makes the previous answer obsolete
export const SourceSuggestions = ({token, api, search, categories, onImported}) => {
    const [news, setNews] = useState(null);         // null: not looked for yet
    const [sources, setSources] = useState([]);
    const [missing, setMissing] = useState(0);
    const [tried, setTried] = useState(0);        // media whose feed was looked for, out of the missing ones
    const [selected, setSelected] = useState([]);
    // the sources are filed under the first category searched unless the user picks another one
    const [category, setCategory] = useState(search?.category?.[0] ?? '');
    const [isLooking, setIsLooking] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

        const handleLook = async () => {
        setIsLooking(true);
        const data = await api.suggestSources({keywords: search.keywords, timeframe: search.timeframe, language: search.language}, token);
        setIsLooking(false);

        if (!data || data.error) {
            toast.error(data?.error ?? "The web could not be searched.");
            return;
        }

        setNews(data.news ?? []);
        setSources(data.sources ?? []);
        setMissing(data.missing ?? 0);
        setTried(data.tried ?? 0);
        setSelected((data.sources ?? []).map(source => source.feed));
    };

    const handleAdd = async () => {
        if (!category) {
            toast.error('Pick the category these sources belong to.');
            return;
        }

        const chosen = sources
            .filter(source => selected.includes(source.feed))
            .map(source => ({site: source.site, feed: source.feed, category}));

        setIsAdding(true);
        const data = await api.importSources(chosen, token, search.language, search.keywords);
        setIsAdding(false);

        if (!data || data.error) {
            toast.error(data?.error ?? "These sources could not be added.");
            return;
        }

        const added = data.feeds?.length ?? 0;
        if (added > 0) {
            toast.success(`${added} source${added > 1 ? 's' : ''} added. Search again to read their news here, with their key passages.`);
        }
        for (let failed of data.errors ?? []) {
            toast.error(`${failed.site}: ${failed.error}`);
        }

        // the added ones leave the list and the selection, the others stay so they can still be added
        const done = (data.feeds ?? []).map(feed => feed.url);
        setSources(sources.filter(source => !done.includes(source.feed)));
        setSelected(selected.filter(feed => !done.includes(feed)));
        setMissing(Math.max(0, missing - added));
        onImported?.();
    };

    return (
        <Section
            kicker="Beyond your sources"
            title="What this search misses"
            intro={news === null && (
                "Other media publish on your search without being in your sources. This asks Google News which news you "
                + "are missing and which media publish them, then adds the ones you choose. It takes about a minute: "
                + "each medium found is opened to look for its feed."
            )}
            aside={
                <Button size="sm" onClick={handleLook} loading={isLooking}>
                    {news === null ? 'Look on the web' : 'Look again'}
                </Button>
            }
        >
            {/* measured 40 to 70 s: the button alone looked like nothing happened */}
            {isLooking && <Working>Asking Google News and opening the media it names: about a minute…</Working>}

            {!isLooking && news !== null && news.length === 0 && sources.length === 0 && (
                <p className="caption">
                    {missing === 0
                        ? "No medium outside your sources published on this subject."
                        : `${missing} media published on this subject, but nothing could be read or added from them.`}
                </p>
            )}

            {news !== null && news.length > 0 && (
                <div className="grid-12">
                    <p className="caption col-span-12 max-w-[60ch] md:col-span-7 md:col-start-3">
                        {news.length} news your sources could not find. They open at the publisher:
                        the server cannot read them, so they have no key passages.
                    </p>
                    <ul className="col-span-12 mt-4 border-t border-rule md:col-span-10 md:col-start-3">
                        {news.map(item => (
                            <li key={item.url} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-rule py-3">
                                <MetaLine className="w-full sm:w-56 sm:shrink-0">
                                    <Meta tone="ink">{item.name}</Meta>
                                    <Meta>{publishedAgo(item.publishedAt)}</Meta>
                                </MetaLine>
                                <a href={item.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 hover:text-accent-ink">{item.title}</a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {news !== null && sources.length > 0 && (
                <div className="grid-12 mt-12">
                    <div className="col-span-12 md:col-span-10 md:col-start-3">
                        <p className="caption max-w-[60ch]">
                            {missing} media published on this subject without being in your sources.
                            Looking for the feed of a site costs several requests, so only the {tried} publishing
                            the most were tried: {sources.length === 1 ? 'one has' : `${sources.length} have`} an
                            RSS feed. Add them to read them here from now on:
                        </p>
                        <div className="mt-4 flex flex-col border-t border-rule pt-3">
                            {sources.map(source => (
                                <Checkbox key={source.feed} checked={selected.includes(source.feed)} className="py-2"
                                          onChange={event => setSelected(event.target.checked
                                              ? [...selected, source.feed]
                                              : selected.filter(feed => feed !== source.feed))}>
                                    <span className="font-semibold">{source.name}</span>{' '}
                                    <Meta>{source.news} news</Meta>
                                    <span className="caption block [overflow-wrap:anywhere]">{feedAddress(source.feed)}</span>
                                    {source.sample && <span className="caption block italic">e.g. "{source.sample}"</span>}
                                </Checkbox>
                            ))}
                        </div>
                        <div className="mt-6 flex flex-wrap items-end gap-4">
                            <div className="w-48">
                                <Label htmlFor="suggestion-category">Category</Label>
                                <Select id="suggestion-category" placeholder="Category" value={category}
                                        onChange={event => setCategory(event.target.value)}
                                        options={categories.map(name => ({value: name, label: name}))}/>
                            </div>
                            <Button variant="primary" onClick={handleAdd} loading={isAdding} disabled={selected.length === 0}>
                                Add {selected.length} source{selected.length > 1 ? 's' : ''}
                            </Button>
                            <p className="caption">They stay private to your searches.</p>
                        </div>
                    </div>
                </div>
            )}
        </Section>
    );
};
