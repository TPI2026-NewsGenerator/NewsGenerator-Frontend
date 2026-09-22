//
//  Author: Fabian Rostello
//  Date: 22.09.2026
//  File: UserFeeds.jsx
//  Description: Sources added by the user, used in their searches only
//

import {useEffect, useState} from "react";
import {Button, HStack, IconButton, InputGroup, Input, Message, SelectPicker, Tag, Text, toaster, VStack} from "rsuite";
import {FaPlus, FaTrash} from "react-icons/fa";

export const UserFeeds = ({token, categories, api}) => {
    const [feeds, setFeeds] = useState([]);
    const [site, setSite] = useState('');
    const [category, setCategory] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (!token) return;

        api.getUserFeeds(token)
            .then(data => setFeeds(data.feeds ?? []))
            .catch(e => console.error("Failed to fetch sources", e));
    }, [token, api]);

    const handleAdd = async () => {
        if (!site.trim() || !category) {
            toaster.push(<Message type="error">Enter a website and pick a category.</Message>);
            return;
        }

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
