//
//  Author: Fabian Rostello
//  Date: 22.09.2026
//  File: SourceSuggestions.jsx
//  Description: Media covering the search but missing from the sources, added in one click
//

import {useEffect, useState} from "react";
import {
    Button, Checkbox, CheckboxGroup, HStack, Message, Panel, SelectPicker, Tag, Text, toaster, VStack
} from "rsuite";
import {FaSearchPlus} from "react-icons/fa";

export const SourceSuggestions = ({token, api, search, categories, onImported}) => {
    const [sources, setSources] = useState(null);       // null: not looked for yet
    const [missing, setMissing] = useState(0);
    const [selected, setSelected] = useState([]);
    const [category, setCategory] = useState(null);
    const [isLooking, setIsLooking] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // a new search makes the previous suggestions obsolete, and the sources are filed under the
    // first category searched unless the user picks another one
    useEffect(() => {
        setSources(null);
        setSelected([]);
        setCategory(search?.category?.[0] ?? null);
    }, [search]);

    const handleLook = async () => {
        setIsLooking(true);
        const data = await api.suggestSources({keywords: search.keywords, timeframe: search.timeframe}, token);
        setIsLooking(false);

        if (!data || data.error) {
            toaster.push(<Message type="error">{data?.error ?? "The missing sources could not be listed."}</Message>);
            return;
        }

        setSources(data.sources ?? []);
        setMissing(data.missing ?? 0);
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
            toaster.push(<Message type="success">{added} source{added > 1 ? 's' : ''} added, they are searched from your next search.</Message>);
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
        <Panel bordered width={'75vw'} style={{width: '75vw', background: '#fff'}}
               header={
                   <HStack justifyContent="space-between" alignItems="center">
                       <Text fontWeight={600}>Missing sources</Text>
                       <Button appearance="ghost" color="orange" size="sm" startIcon={<FaSearchPlus/>}
                               onClick={handleLook} loading={isLooking}>
                           {sources === null ? 'Look for media covering this search' : 'Look again'}
                       </Button>
                   </HStack>
               }>
            {sources === null && (
                <Text muted size="sm">
                    Other media publish on your keywords without being in your sources. This asks Google News
                    which ones, finds their RSS feed, and adds the ones you choose. It takes a few seconds.
                </Text>
            )}

            {sources !== null && sources.length === 0 && (
                <Text muted size="sm">
                    {missing === 0
                        ? "No medium outside your sources published on these keywords."
                        : `${missing} media published on these keywords, but none of the first ones has a usable RSS feed.`}
                </Text>
            )}

            {sources !== null && sources.length > 0 && (
                <VStack align="stretch" spacing={10}>
                    <Text muted size="sm">
                        {missing} media published on these keywords without being in your sources.{' '}
                        {sources.length === 1 ? 'One of them has an RSS feed:' : `These ${sources.length} have an RSS feed:`}
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
