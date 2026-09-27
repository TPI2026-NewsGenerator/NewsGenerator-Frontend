//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: Profile.jsx
//  Description: The profile of the user: what they want to read in their own words, the interests
//               the AI read in it, and the sources found for them
//

import {useCallback, useEffect, useState} from "react";
import {
    Button, ButtonToolbar, Card, Checkbox, CheckboxGroup, Container, Content, CustomProvider, Heading,
    IconButton, Input, Loader, Message, Tag, Text, VStack, HStack, toaster
} from "rsuite";
import TrashIcon from '@rsuite/icons/Trash';
import {FaStar} from "react-icons/fa";
import {CustomNavbar} from "@/features/navbar/components/Navbar.jsx";
import {ProfileApi} from "@/features/briefing/api/briefingApi.js";
import {FeedApi} from "@/features/search/api/feedApi.js";
import {RecommendedSources} from "@/features/briefing/components/RecommendedSources.jsx";
import {useAuth} from "@/features/auth/useAuth.js";

const POLL_MS = 5000;
const LANGUAGES = {en: 'English', fr: 'French', es: 'Spanish', de: 'German', it: 'Italian'};
const DISCOVERY = {
    idle: {color: undefined, label: 'not started'},
    running: {color: 'blue', label: 'looking for sources…'},
    done: {color: 'green', label: 'done'},
    failed: {color: 'red', label: 'failed'},
};
const PLACEHOLDER = "I follow rugby: the Top 14, the Six Nations and the transfers. I also love fashion: new collections, brands, shows. " +
    "I don't want football or celebrity gossip.";

// one interest read by the AI, which the user can correct
const Interest = ({interest, onSave, onDelete, busy}) => {
    const [text, setText] = useState(interest.text);
    const secondary = interest.weight < 1;

    return (
        <Card padding={14} bordered>
            <HStack spacing={10} alignItems="flex-start">
                <Input as="textarea" rows={2} value={text} onChange={setText} style={{flex: 1}}/>
                <VStack spacing={6}>
                    <Button size="sm" disabled={busy || text.trim() === interest.text} onClick={() => onSave({text})}>Save</Button>
                    <Button size="sm" appearance="subtle" disabled={busy} onClick={() => onSave({weight: secondary ? 1 : 0.85})}
                            title="A secondary interest weighs less in the briefing">
                        {secondary ? 'Secondary' : 'Main'}
                    </Button>
                    <IconButton size="sm" icon={<TrashIcon/>} disabled={busy} onClick={onDelete} title="Remove this interest"/>
                </VStack>
            </HStack>
            {interest.keywords && <Text muted size="sm" marginTop={6}>Keywords used to find its sources: {interest.keywords}</Text>}
        </Card>
    );
};

export const ProfilePage = () => {
    const {token, user, logout, expired} = useAuth();
    const [options, setOptions] = useState({topics: [], languages: []});
    const [data, setData] = useState(null);         // {profile, interests, sources}
    const [form, setForm] = useState({text: '', topics: [], languages: ['en']});
    const [saving, setSaving] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    // every call answers the whole profile, shown as it is
    const apply = useCallback((answer, {fillForm = false} = {}) => {
        if (expired(answer)) return false;
        if (answer.error) {
            setError(answer.error);
            return false;
        }
        setData(answer);
        if (fillForm && answer.profile) {
            setForm({text: answer.profile.text, topics: answer.profile.topics, languages: answer.profile.languages});
        }
        return true;
    }, [expired]);

    useEffect(() => {
        if (!user) {
            logout();
            return;
        }
        ProfileApi.getOptions().then(setOptions).catch(err => setError(err.message));
        ProfileApi.get(token).then(answer => apply(answer, {fillForm: true})).catch(err => setError(err.message));
    }, [user, token, logout, apply]);

    // the sources are found in background: asked again until done
    const discovering = data?.profile?.discovery?.status === 'running';
    useEffect(() => {
        if (!discovering) return undefined;
        const timer = setTimeout(() => ProfileApi.get(token).then(answer => apply(answer)), POLL_MS);
        return () => clearTimeout(timer);
    }, [data, discovering, token, apply]);

    const save = async () => {
        setError(null);
        setSaving(true);
        try {
            if (apply(await ProfileApi.save(form, token))) {
                toaster.push(<Message type="success">Profile saved, its sources are being found.</Message>);
            }
        } finally {
            setSaving(false);
        }
    };

    // a change of an interest, then the profile as the server answers it
    const change = async (call) => {
        setError(null);
        setBusy(true);
        try {
            apply(await call());
        } finally {
            setBusy(false);
        }
    };

    const discovery = DISCOVERY[data?.profile?.discovery?.status ?? 'idle'];
    const limits = data?.limits ?? {profileFeeds: 60, relevanceDays: 14};
    // the sources the thumbs left out: still listed with the others, marked
    const refused = new Set((data?.refusedSources ?? []).map(source => source.url));

    return (
        <CustomProvider theme="light">
            <CustomNavbar user={user} removeAuthCredentials={logout}/>
            <Container className="app-header">
                <Content width={'75vw'} marginTop={80}>
                    <VStack align="stretch" gap={20}>
                        <Text size={'3xl'} weight={'semibold'} className={'title'}>Your profile</Text>
                        {error && <Message type="error" closable onClose={() => setError(null)}>{error}</Message>}

                        <Card padding={20} shaded>
                            <Heading level={5}>What do you want to read?</Heading>
                            <Text muted marginTop={6}>
                                In your own words: the subjects you follow, how closely, and what you don't want.
                                The AI splits it into interests, and sources are found for each of them.
                            </Text>
                            <Input as="textarea" rows={6} value={form.text} placeholder={PLACEHOLDER}
                                   onChange={text => setForm({...form, text})} style={{marginTop: 12}}/>

                            <Text weight="semibold" marginTop={14}>Languages you read</Text>
                            <CheckboxGroup inline value={form.languages} onChange={languages => setForm({...form, languages})}>
                                {options.languages.map(language => (
                                    <Checkbox key={language} value={language}>{LANGUAGES[language] ?? language}</Checkbox>
                                ))}
                            </CheckboxGroup>

                            <Text weight="semibold" marginTop={10}>Topics (optional)</Text>
                            <CheckboxGroup inline value={form.topics} onChange={topics => setForm({...form, topics})}>
                                {options.topics.map(topic => <Checkbox key={topic} value={topic}>{topic}</Checkbox>)}
                            </CheckboxGroup>

                            <ButtonToolbar style={{marginTop: 14}}>
                                <Button appearance="primary" color="orange" onClick={save} loading={saving}
                                        disabled={form.text.trim().length < 20 || form.languages.length === 0}>
                                    {data?.profile ? 'Save my profile' : 'Create my profile'}
                                </Button>
                            </ButtonToolbar>
                            {saving && <Text muted size="sm" marginTop={6}>The AI reads your profile, this takes a few seconds…</Text>}
                        </Card>

                        {data?.interests?.length > 0 && (
                            <VStack align="stretch" gap={10}>
                                <Heading level={5}>Your interests</Heading>
                                <Text muted size="sm">Each one is matched on its own with the news: correct them if the AI misread you.</Text>
                                {data.interests.map(interest => (
                                    <Interest key={`${interest.id}:${interest.text}:${interest.weight}`} interest={interest} busy={busy}
                                              onSave={changes => change(() => ProfileApi.updateInterest(interest.id, changes, token))}
                                              onDelete={() => change(() => ProfileApi.deleteInterest(interest.id, token))}/>
                                ))}
                            </VStack>
                        )}

                        {data?.profile && (
                            <Card padding={20} bordered>
                                <HStack justifyContent="space-between">
                                    <Heading level={5}>Sources found for you</Heading>
                                    <Tag color={discovery.color}>{discovery.label}</Tag>
                                </HStack>
                                <Text muted size="sm" marginTop={6}>
                                    The media that publish on your interests, and in each of them the section about them,
                                    read with the shared sources, only for you. Each search adds new ones to these, up
                                    to {limits.profileFeeds}; a source with no news on your interests
                                    in {limits.relevanceDays} days is removed.
                                </Text>
                                {data.googleSearches > 0 && (
                                    <Text muted size="sm" marginTop={6}>
                                        Google News is also searched for your interests ({data.googleSearches} searches,
                                        every hour): a story it alone tells needs two media, or one we already read.
                                    </Text>
                                )}
                                {discovering && <Loader content="This takes a few minutes…" style={{marginTop: 10}}/>}
                                {data.profile.discovery.status === 'failed' && (
                                    <Message type="error" marginTop={10}>{data.profile.discovery.error}</Message>
                                )}
                                {!discovering && data.sources.length === 0 && data.profile.discovery.status === 'done' && (
                                    <Message type="info" marginTop={10}>No source beyond the shared ones was found for your interests.</Message>
                                )}
                                <ul className="briefing-sources">
                                    {data.sources.map(source => (
                                        <li key={source.id}>
                                            <b>{source.site}</b>
                                            {source.trusted && <FaStar size={12} color="var(--rs-yellow-500)" title="A source you trust" aria-label="a source you trust" style={{marginLeft: 4}}/>}
                                            {' '}<Tag size="sm">{source.category}</Tag> {source.language && <Tag size="sm">{source.language}</Tag>}{' '}
                                            {refused.has(source.url) && (
                                                <Tag size="sm" color="red" title="Left out after your thumbs: no longer read for your briefing, see below">left out</Tag>
                                            )}{' '}
                                            <Tag size="sm" color={source.relevant > 0 ? 'green' : undefined}
                                                 title={`Its news of the last ${limits.relevanceDays} days on your interests`}>
                                                {source.relevant > 0 ? `${source.relevant} news on your interests` : 'nothing on your interests lately'}
                                            </Tag>
                                            {source.error && <Text as="span" size="sm" style={{color: "var(--rs-red-500)"}}> {source.error}</Text>}
                                            <Text muted size="sm">{source.url}</Text>
                                        </li>
                                    ))}
                                </ul>
                                <Button style={{marginTop: 10}} disabled={discovering || busy}
                                        onClick={() => change(() => ProfileApi.rediscover(token))}>
                                    Find more sources
                                </Button>
                            </Card>
                        )}

                        {data?.profile && (
                            <RecommendedSources token={token} api={FeedApi} expired={expired}
                                                reloadKey={`${data.profile.discovery.status}:${data.interests.map(interest => interest.id).join(',')}`}/>
                        )}

                        {data?.refusedSources?.length > 0 && (
                            <Card padding={20} bordered>
                                <Heading level={5}>Sources left out after your thumbs</Heading>
                                <Text muted size="sm" marginTop={6}>
                                    These sources found for you brought stories you said were not for you, again and again:
                                    they are no longer read for your briefing, and not found again. Keep one to bring it back for good.
                                </Text>
                                <ul className="briefing-sources">
                                    {data.refusedSources.map(source => (
                                        <li key={source.url}>
                                            <HStack justifyContent="space-between" alignItems="center">
                                                <div>
                                                    <b>{source.site}</b>{' '}
                                                    <Tag size="sm" color="red">{source.refused} not for me</Tag>{' '}
                                                    {source.liked > 0 && <Tag size="sm" color="green">{source.liked} good for me</Tag>}
                                                    <Text muted size="sm" style={{overflowWrap: 'anywhere'}}>{source.url}</Text>
                                                </div>
                                                <Button size="sm" disabled={busy}
                                                        onClick={() => change(() => ProfileApi.keepSource(source.url, token))}>
                                                    Keep it
                                                </Button>
                                            </HStack>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        )}
                    </VStack>
                </Content>
            </Container>
        </CustomProvider>
    );
};
