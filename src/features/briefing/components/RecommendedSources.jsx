//
//  Author: Fabian Rostello
//  Date: 25.09.2026
//  File: RecommendedSources.jsx
//  Description: Sources the reader could add: found for the profiles of other readers, or shared by
//               them, and publishing on the interests of this one
//

import {useEffect, useState} from "react";
import {Button, Card, Heading, HStack, Loader, Message, Tag, Text, toaster} from "rsuite";

// api: FeedApi. reloadKey: asked again when it changes (a discovery done, the interests changed)
export const RecommendedSources = ({token, api, expired, reloadKey}) => {
    const [sources, setSources] = useState(null);
    const [adding, setAdding] = useState(null);         // the ids being added
    const [error, setError] = useState(null);

    useEffect(() => {
        let current = true;
        api.getRecommended(token)
            .then(answer => {
                if (!current || expired(answer)) return;
                if (answer.error) setError(answer.error);
                else setSources(answer.sources ?? []);
            })
            .catch(err => current && setError(err.message));
        return () => {
            current = false;
        };
    }, [token, api, expired, reloadKey]);

    const add = async (ids) => {
        setAdding(ids);
        try {
            const answer = await api.addRecommended(ids, token);
            if (expired(answer)) return;
            if (answer.error) {
                toaster.push(<Message type="error">{answer.error}</Message>);
                return;
            }
            const done = new Set((answer.feeds ?? []).map(feed => feed.url));
            if (done.size > 0) {
                toaster.push(<Message type="success">
                    {done.size} source{done.size > 1 ? 's' : ''} added: you find them with the ones you added by hand, on the search page.
                </Message>);
            }
            for (const failed of answer.errors ?? []) {
                toaster.push(<Message type="error">{failed.site ?? 'A source'}: {failed.error}</Message>);
            }
            const failedIds = new Set((answer.errors ?? []).map(failed => failed.id));
            setSources(sources.filter(source => !ids.includes(source.id) || failedIds.has(source.id)));
        } catch (err) {
            toaster.push(<Message type="error">{err.message}</Message>);
        } finally {
            setAdding(null);
        }
    };

    if (error) return <Message type="error">{error}</Message>;
    if (sources === null) return <Loader content="Looking for sources you could add…"/>;
    if (sources.length === 0) return null;

    return (
        <Card padding={20} bordered>
            <HStack justifyContent="space-between" alignItems="center">
                <Heading level={5}>Sources you could add</Heading>
                <Button size="sm" appearance="primary" color="orange" loading={adding?.length > 1} disabled={adding !== null}
                        onClick={() => add(sources.map(source => source.id))}>
                    Add all {sources.length}
                </Button>
            </HStack>
            <Text muted size="sm" marginTop={6}>
                Found for the profiles of other readers, or shared by them, they published on your interests this week.
                A source another reader added by hand is never shown here unless they chose to share it.
            </Text>
            <ul className="briefing-sources">
                {sources.map(source => (
                    <li key={source.id}>
                        <HStack justifyContent="space-between" alignItems="center">
                            <div style={{minWidth: 0}}>
                                <b>{source.site}</b>{' '}
                                <Tag size="sm" color="green">{source.relevant} of {source.news} news on your interests</Tag>{' '}
                                <Tag size="sm">{source.category}</Tag>{' '}
                                {source.language && <Tag size="sm">{source.language}</Tag>}
                                {source.samples?.map(title => (
                                    <Text key={title} muted size="sm" style={{overflowWrap: 'anywhere'}}>“{title}”</Text>
                                ))}
                            </div>
                            <Button size="sm" disabled={adding !== null} loading={adding?.length === 1 && adding[0] === source.id}
                                    onClick={() => add([source.id])}>
                                Add
                            </Button>
                        </HStack>
                    </li>
                ))}
            </ul>
        </Card>
    );
};
