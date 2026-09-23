//
//  Author: Fabian Rostello
//  Date: 22.09.2026
//  File: SourceSuggestions.jsx
//  Description: What the search misses: the news of the media that are not in the sources, read
//               only, and those media to add in one click
//

import {useEffect, useState} from "react";
import {
    Button, Checkbox, CheckboxGroup, Divider, HStack, Message, Panel, SelectPicker, Tag, Text, toaster, VStack
} from "rsuite";
import {FaSearchPlus} from "react-icons/fa";

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

export const SourceSuggestions = ({token, api, search, categories, onImported}) => {
    const [news, setNews] = useState(null);         // null: not looked for yet
    const [sources, setSources] = useState([]);
    const [missing, setMissing] = useState(0);
    const [tried, setTried] = useState(0);        // media whose feed was looked for, out of the missing ones
    const [selected, setSelected] = useState([]);
    const [category, setCategory] = useState(null);
    const [isLooking, setIsLooking] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // a new search makes the previous answer obsolete, and the sources are filed under the first
    // category searched unless the user picks another one
    useEffect(() => {
        setNews(null);
        setSources([]);
        setSelected([]);
        setCategory(search?.category?.[0] ?? null);
    }, [search]);

    const handleLook = async () => {
        setIsLooking(true);
        const data = await api.suggestSources({keywords: search.keywords, timeframe: search.timeframe, language: search.language}, token);
        setIsLooking(false);

        if (!data || data.error) {
            toaster.push(<Message type="error">{data?.error ?? "The web could not be searched."}</Message>);
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
            toaster.push(<Message type="error">Pick the category these sources belong to.</Message>);
            return;
        }

        const chosen = sources
            .filter(source => selected.includes(source.feed))
            .map(source => ({site: source.site, feed: source.feed, category}));

        setIsAdding(true);
        const data = await api.importSources(chosen, token);
        setIsAdding(false);

        if (!data || data.error) {
            toaster.push(<Message type="error">{data?.error ?? "These sources could not be added."}</Message>);
            return;
        }

        const added = data.feeds?.length ?? 0;
        if (added > 0) {
            toaster.push(
                <Message type="success">
                    {added} source{added > 1 ? 's' : ''} added. Search again to read their news here, with the AI resume.
                </Message>
            );
        }
        for (let failed of data.errors ?? []) {
            toaster.push(<Message type="error">{failed.site}: {failed.error}</Message>);
        }

        // the added ones leave the list and the selection, the others stay so they can still be added
        const done = (data.feeds ?? []).map(feed => feed.url);
        setSources(sources.filter(source => !done.includes(source.feed)));
        setSelected(selected.filter(feed => !done.includes(feed)));
        setMissing(Math.max(0, missing - added));
        onImported?.();
    };

    return (
        <Panel bordered style={{width: '75vw', background: '#fff'}}
               header={
                   <HStack justifyContent="space-between" alignItems="center">
                       <Text fontWeight={600}>What this search misses</Text>
                       <Button appearance="ghost" color="orange" size="sm" startIcon={<FaSearchPlus/>}
                               onClick={handleLook} loading={isLooking}>
                           {news === null ? 'Look on the web' : 'Look again'}
                       </Button>
                   </HStack>
               }>
            {news === null && (
                <Text muted size="sm">
                    Other media publish on your keywords without being in your sources. This asks Google News
                    which news you are missing and which media publish them, then adds the ones you choose.
                    It takes a few seconds.
                </Text>
            )}

            {news !== null && news.length === 0 && sources.length === 0 && (
                <Text muted size="sm">
                    {missing === 0
                        ? "No medium outside your sources published on these keywords."
                        : `${missing} media published on these keywords, but nothing could be read or added from them.`}
                </Text>
            )}

            {news !== null && news.length > 0 && (
                <VStack align="stretch" spacing={6}>
                    <Text muted size="sm">
                        {news.length} news your sources could not find. They open at the publisher:
                        the server cannot read them, so they have no AI resume.
                    </Text>

                    {news.map(item => (
                        <HStack key={item.url} spacing={8} alignItems="flex-start">
                            <Tag size="sm">{item.name}</Tag>
                            <Text muted size="sm" style={{whiteSpace: 'nowrap'}}>{publishedAgo(item.publishedAt)}</Text>
                            <a href={item.url} target="_blank" rel="noreferrer" style={{flex: 1}}>{item.title}</a>
                        </HStack>
                    ))}
                </VStack>
            )}

            {news !== null && sources.length > 0 && (
                <VStack align="stretch" spacing={10}>
                    <Divider/>
                    <Text muted size="sm">
                        {missing} media published on these keywords without being in your sources.
                        Looking for the feed of a site costs several requests, so only the {tried} publishing
                        the most were tried: {sources.length === 1 ? 'one has' : `${sources.length} have`} an
                        RSS feed. Add them to read them here from now on:
                    </Text>

                    <CheckboxGroup value={selected} onChange={setSelected}>
                        {sources.map(source => (
                            <Checkbox key={source.feed} value={source.feed} color="orange">
                                <HStack spacing={8} alignItems="center">
                                    <Text fontWeight={600}>{source.name}</Text>
                                    <Tag size="sm" color="orange">{source.news} news</Tag>
                                    <Text muted size="sm">{source.feed}</Text>
                                </HStack>
                                {source.sample && <Text muted size="sm">e.g. "{source.sample}"</Text>}
                            </Checkbox>
                        ))}
                    </CheckboxGroup>

                    <HStack spacing={8} alignItems="center">
                        <SelectPicker data={categories.map(name => ({value: name, label: name}))}
                                      value={category} onChange={setCategory} placeholder="Category"
                                      searchable={false} cleanable={false} style={{width: 150}}/>
                        <Button appearance="primary" color="orange" onClick={handleAdd}
                                loading={isAdding} disabled={selected.length === 0}>
                            Add {selected.length} source{selected.length > 1 ? 's' : ''}
                        </Button>
                        <Text muted size="sm">They stay private to your searches.</Text>
                    </HStack>
                </VStack>
            )}
        </Panel>
    )
}
