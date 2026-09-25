//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: Briefing.jsx
//  Description: The daily briefing: the stories of the last hours chosen for the profile of the user
//

import {useCallback, useEffect, useState} from "react";
import {Button, Container, Content, CustomProvider, Loader, Message, Text, VStack} from "rsuite";
import {Link} from "react-router-dom";
import {CustomNavbar} from "@/features/navbar/components/Navbar.jsx";
import {BriefingCard} from "@/features/briefing/components/BriefingCard.jsx";
import {BriefingApi, ProfileApi} from "@/features/briefing/api/briefingApi.js";
import {useSeenCards} from "@/features/briefing/useSeenCards.js";
import {useAuth} from "@/features/auth/useAuth.js";

const POLL_MS = 3000;

// what the server is doing while it writes the briefing
const STEPS = {
    starting: 'Starting…',
    ranking: 'Looking for the stories of the last 48 hours closest to your interests…',
    choosing: 'The AI chooses the stories that fit your profile…',
    checking: 'The AI checks which articles tell the same news…',
    reading: 'Reading the articles of each story…',
    summarizing: 'Writing the summaries…',
};

export const BriefingPage = () => {
    const {token, user, logout, expired} = useAuth();
    const [profile, setProfile] = useState(undefined);      // undefined: not loaded yet
    const [briefing, setBriefing] = useState(undefined);
    const [error, setError] = useState(null);
    const observe = useSeenCards(briefing, token);

    const load = useCallback(async () => {
        try {
            const data = await BriefingApi.getLatest(token);
            if (expired(data)) return;
            if (data.error) throw new Error(data.error);
            setBriefing(data.briefing);
        } catch (err) {
            setError(err.message);
        }
    }, [token, expired]);

    // the profile says whether a briefing can be written at all
    useEffect(() => {
        if (!user) {
            logout();
            return;
        }
        ProfileApi.get(token)
            .then(data => {
                if (expired(data)) return;
                setProfile(data.profile ?? null);
            })
            .catch(err => setError(err.message));
        load();
    }, [user, token, logout, expired, load]);

    // asked again while it is written
    useEffect(() => {
        if (briefing?.status !== 'running') return undefined;
        const timer = setTimeout(load, POLL_MS);
        return () => clearTimeout(timer);
    }, [briefing, load]);

    const start = async () => {
        setError(null);
        const data = await BriefingApi.start(token);
        if (expired(data)) return;
        if (data.error) setError(data.error);
        else setBriefing(data.briefing);
    };

    // shown at once, taken back if the server refuses it
    const vote = async (storyId, value) => {
        const setVote = (to) => setBriefing(current => current && ({
            ...current,
            items: current.items.map(item => item.storyId === storyId ? {...item, vote: to} : item),
        }));
        const before = briefing.items.find(item => item.storyId === storyId)?.vote ?? null;
        setVote(value);
        try {
            await BriefingApi.vote(briefing.id, storyId, value, token);
        } catch (err) {
            setVote(before);
            setError(`The thumb was not saved: ${err.message}`);
        }
    };

    const running = briefing?.status === 'running';

    return (
        <CustomProvider theme="light">
            <CustomNavbar user={user} removeAuthCredentials={logout}/>
            <Container className="app-header">
                <Content width={'75vw'} marginTop={80}>
                    <VStack align="stretch" gap={20}>
                        <Text size={'3xl'} weight={'semibold'} className={'title'}>Your briefing</Text>

                        {error && <Message type="error" closable onClose={() => setError(null)}>{error}</Message>}

                        {profile === null && (
                            <Message type="info">
                                Tell us what you want to read first: <Link to="/profile">write your profile</Link>.
                                The briefing is chosen from it, and the sources are found for it.
                            </Message>
                        )}

                        {profile && (
                            <div>
                                <Button appearance="primary" color="orange" onClick={start} loading={running} disabled={running}>
                                    New briefing
                                </Button>
                                <Text muted size="sm" marginTop={6}>
                                    The stories of the last 48 hours closest to your interests, chosen by the AI. A story you saw in the last 3 days is not shown again, the ones you did not reach can come back.
                                </Text>
                            </div>
                        )}

                        {running && (
                            <Loader content={STEPS[briefing.step] ?? 'Working…'} vertical/>
                        )}

                        {briefing?.status === 'failed' && (
                            <Message type="error">The last briefing could not be written: {briefing.error}</Message>
                        )}

                        {briefing?.status === 'ready' && (
                            <>
                                <Text muted>
                                    Written {new Date(briefing.finishedAt ?? briefing.createdAt).toLocaleString()}
                                    {briefing.items.length > 0 && ` · ${briefing.items.length} ${briefing.items.length === 1 ? 'story' : 'stories'}`}
                                </Text>
                                {briefing.items.length === 0 && (
                                    <Message type="info">
                                        No story of the last hours really fits your profile. A short briefing is better than an off-topic one:
                                        try again later, or <Link to="/profile">widen your profile</Link>.
                                    </Message>
                                )}
                                {briefing.items.map(item => (
                                    <div key={item.storyId} ref={observe(item.storyId)}>
                                        <BriefingCard item={item} onVote={value => vote(item.storyId, value)}/>
                                    </div>
                                ))}
                            </>
                        )}
                    </VStack>
                </Content>
            </Container>
        </CustomProvider>
    );
};
