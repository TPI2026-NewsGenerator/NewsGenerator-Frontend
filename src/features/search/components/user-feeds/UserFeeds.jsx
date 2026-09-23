//
//  Author: Fabian Rostello
//  Date: 22.09.2026
//  File: UserFeeds.jsx
//  Description: Sources added by the user, used in their searches only
//

import {useEffect, useState} from "react";
import {
    Button, Checkbox, CheckboxGroup, HStack, IconButton, InputGroup, Input, Message, SelectPicker,
    Tag, Text, toaster, VStack
} from "rsuite";
import {FaPlus, FaSearch, FaTrash} from "react-icons/fa";

export const UserFeeds = ({token, categories, api, reloadKey}) => {
    const [feeds, setFeeds] = useState([]);
    const [site, setSite] = useState('');
    const [category, setCategory] = useState(null);
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
        toaster.push(<Message type="error">Pick a category first.</Message>);
        return false;
    };

    const handleAdd = async () => {
        if (!site.trim()) {
            toaster.push(<Message type="error">Enter a website.</Message>);
            return;
        }
        if (!needCategory()) return;

        setIsAdding(true);
        const data = await api.addUserFeed({site: site.trim(), category}, token);
        setIsAdding(false);

        if (!data || data.error) {
            toaster.push(<Message type="error">{data?.error ?? "This source could not be added."}</Message>);
            return;
        }

        setFeeds([data.feed, ...feeds]);
        setSite('');
        toaster.push(<Message type="success">{data.feed.site} added, e.g. "{data.sample?.[0]}"</Message>);
    };

    const handleSearch = async () => {
        if (!query.trim()) {
            toaster.push(<Message type="error">Enter a subject, like "premier league".</Message>);
            return;
        }

        setIsSearching(true);
        const data = await api.searchSources(query.trim(), token);
        setIsSearching(false);

        if (!data || data.error) {
            toaster.push(<Message type="error">{data?.error ?? "The directory could not be searched."}</Message>);
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
        const data = await api.importSources(chosen, token);
        setIsAdding(false);

        if (!data || data.error) {
            toaster.push(<Message type="error">{data?.error ?? "These sources could not be added."}</Message>);
            return;
        }

        const done = (data.feeds ?? []).map(feed => feed.url);
        if (done.length > 0) {
            toaster.push(<Message type="success">{done.length} source{done.length > 1 ? 's' : ''} added.</Message>);
        }
        for (let failed of data.errors ?? []) {
            toaster.push(<Message type="error">{failed.site}: {failed.error}</Message>);
        }

        setFeeds([...(data.feeds ?? []), ...feeds]);
        setFound(found.filter(source => !done.includes(source.feed)));
        setSelected(selected.filter(feed => !done.includes(feed)));
    };

    const handleDelete = async (feed) => {
        const data = await api.deleteUserFeed(feed.id, token);

        if (!data || data.error) {
            toaster.push(<Message type="error">{data?.error ?? "This source could not be removed."}</Message>);
            return;
        }

        setFeeds(feeds.filter(other => other.id !== feed.id));
    };

    return (
        <VStack align="stretch" spacing={8}>
            <HStack spacing={8} alignItems="flex-start">
                <InputGroup style={{flex: 1}}>
                    <Input value={site} onChange={setSite} placeholder="e.g., engadget.com"
                           onPressEnter={handleAdd} disabled={isAdding}/>
                </InputGroup>
                <SelectPicker data={categories.map(name => ({value: name, label: name}))}
                              value={category} onChange={setCategory} placeholder="Category"
                              searchable={false} cleanable={false} style={{width: 150}}/>
                <Button appearance="ghost" color="orange" startIcon={<FaPlus/>}
                        onClick={handleAdd} loading={isAdding}>Add</Button>
            </HStack>

            <HStack spacing={8} alignItems="flex-start">
                <InputGroup style={{flex: 1}}>
                    <Input value={query} onChange={setQuery} placeholder='or search a subject, e.g., "premier league"'
                           onPressEnter={handleSearch} disabled={isSearching}/>
                </InputGroup>
                <Button appearance="ghost" color="orange" startIcon={<FaSearch/>}
                        onClick={handleSearch} loading={isSearching} style={{width: 150}}>Search</Button>
            </HStack>

            {found !== null && found.length === 0 && (
                <Text muted size="sm">No feed found for "{query}" outside the sources you already have.</Text>
            )}

            {found !== null && found.length > 0 && (
                <VStack align="stretch" spacing={8}>
                    <Text muted size="sm">
                        {found.length} feed{found.length > 1 ? 's' : ''}, the most read first. They are checked when added.
                    </Text>

                    <CheckboxGroup value={selected} onChange={setSelected}>
                        {found.map(source => (
                            <Checkbox key={source.feed} value={source.feed} color="orange">
                                <HStack spacing={8} alignItems="center">
                                    <Text fontWeight={600}>{source.name}</Text>
                                    <Tag size="sm" color="orange">{source.readers} readers</Tag>
                                    {source.language && <Tag size="sm">{source.language}</Tag>}
                                    <Text muted size="sm">{source.site}</Text>
                                </HStack>
                            </Checkbox>
                        ))}
                    </CheckboxGroup>

                    <HStack>
                        <Button appearance="primary" color="orange" onClick={handleAddFound}
                                loading={isAdding} disabled={selected.length === 0}>
                            Add {selected.length} source{selected.length > 1 ? 's' : ''}
                        </Button>
                    </HStack>
                </VStack>
            )}

            {feeds.length === 0
                ? <Text muted size="sm">No source of your own yet. The feed of the site is found automatically.</Text>
                : feeds.map(feed => (
                    <HStack key={feed.id} spacing={8} alignItems="center">
                        <Tag color="orange">{feed.category}</Tag>
                        <Text style={{flex: 1}}>{feed.site}</Text>
                        {feed.error && <Tag color="red" title={feed.error}>not working</Tag>}
                        <Text muted size="sm" style={{maxWidth: '45%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                            {feed.url}
                        </Text>
                        <IconButton size="xs" appearance="subtle" color="red" icon={<FaTrash/>}
                                    aria-label={`Remove ${feed.site}`} onClick={() => handleDelete(feed)}/>
                    </HStack>
                ))}
        </VStack>
    )
}
