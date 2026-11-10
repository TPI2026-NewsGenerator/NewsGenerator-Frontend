//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: Briefing.jsx
//  Description: The daily briefing: the stories of the last hours chosen for the profile of the user,
//               of the last 1 to 7 days as they choose
//

import {useCallback, useEffect, useMemo, useState} from "react";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {Tabs} from "radix-ui";
import {Eye, Link2, ListChecks} from "lucide-react";
import {PageShell, Opening, Toolbar} from "@/components/layout/Page.jsx";
import {SettingsPill} from "@/components/ui/settings-pill.jsx";
import {Button} from "@/components/ui/button.jsx";
import {ToolButton, ToolPopover} from "@/components/ui/tool-popover.jsx";
import {Notice, Working} from "@/components/ui/text.jsx";
import {BriefingCard} from "@/features/briefing/components/BriefingCard.jsx";
import {BriefingWindow} from "@/features/briefing/components/BriefingWindow.jsx";
import {FollowingNews} from "@/features/briefing/components/FollowingNews.jsx";
import {useFollowing} from "@/features/briefing/useFollowing.js";
import {SearchApi} from "@/features/search/api/searchApi.js";
import {createTranslator} from "@/features/search/translation.js";
import {DEFAULT_HOURS, spanOf, watchLimitPreference, windowAfter} from "@/features/briefing/windows.js";
import {BriefingApi, ProfileApi} from "@/features/briefing/api/briefingApi.js";
import {EntityApi} from "@/features/entities/entityApi.js";
import {BriefingSize} from "@/features/briefing/components/BriefingSize.jsx";
import {sizePreference} from "@/features/briefing/sizes.js";
import {BriefingFormat} from "@/features/briefing/components/BriefingFormat.jsx";
import {FORMATS, formatPreference} from "@/features/briefing/formats.js";
import {useBlocks} from "@/features/briefing/blockPresets.js";
import {usePreference} from "@/features/preferences/usePreference.js";
import {withoutOriginalMarks} from "@/features/briefing/marks.js";
import {MailBar} from "@/features/briefing/components/MailBar.jsx";
import {AddNews} from "@/features/briefing/components/AddNews.jsx";
import {AffairList} from "@/features/affairs/components/AffairList.jsx";
import {useFollowed} from "@/features/affairs/useFollowed.js";
import {cardTelling, MailAddContext} from "@/features/briefing/mailAdd.js";
import {useActiveProfile} from "@/features/profiles/activeProfile.js";
import {useAuth} from "@/features/auth/useAuth.js";
import {toast} from "@/lib/toast.js";

const POLL_MS = 3000;
// the analysis takes minutes after the cards: asked less often
const ANALYSIS_POLL_MS = 8000;

// what the server is doing while it writes the briefing of the last 'span'
const steps = (span) => ({
    starting: 'Starting…',
    ranking: `Looking for the stories of the last ${span} closest to your interests…`,
    choosing: 'The AI chooses the stories that fit your profile…',
    checking: 'The AI checks which articles tell the same news…',
    reading: 'Reading the articles of each story…',
    summarizing: 'Choosing the key passages of each story…',
    angles: 'Looking for other angles on each story…',
});

// a tab of the page: a segment of the toolbar, the one read raised
const PAGE_TAB = 'inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[0.8125rem] text-ink-mute transition-[color,background-color,box-shadow] duration-200 hover:text-ink data-[state=active]:bg-paper data-[state=active]:text-ink data-[state=active]:shadow-[0_1px_3px_rgba(0,0,0,0.12)] dark:data-[state=active]:bg-rule';

const written = (at) => new Date(at).toLocaleString('en-GB', {weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'});

export const BriefingPage = () => {
    const {user, logout, expired} = useAuth();
    const [profile, setProfile] = useState(undefined);      // undefined: not loaded yet
    const [briefing, setBriefing] = useState(undefined);
    const [error, setError] = useState(null);
    // the hours of news of the next briefing: the ones of the last until the reader chooses (the default
    // after one of a window no longer offered)
    const [chosen, setChosen] = useState(null);
    const hours = chosen ?? windowAfter(briefing?.hours ?? DEFAULT_HOURS);
    // whether the profile follows something (its items in the briefing, or words): the page has a tab for
    // their news, with the number wanted for each, the last choice of the reader. These four are kept on the account: the same on every device
    const [follows, setFollows] = useState(false);
    const [watchLimit, chooseWatchLimit] = usePreference(watchLimitPreference);
    // the cards of the next briefing, the last choice of the reader
    const [size, chooseSize] = usePreference(sizePreference);
    // the way the cards are read, the last choice of the reader
    const [format, chooseFormat] = usePreference(formatPreference);
    // what the cards show: the blocks the reader ticked for the page in the settings (the whole card at first)
    const {list: shown} = useBlocks('page');
    // the server can send the cards ticked by e-mail
    const [mail, setMail] = useState(false);
    const [sending, setSending] = useState(false);
    // the cards ticked for the e-mail (their storyId), of one briefing: none in the next one
    const [ticks, setTicks] = useState({briefingId: null, storyIds: []});
    // the briefing whose stories of the terms followed are shown alone, none in the next one
    const [foundView, setFoundView] = useState(null);
    // the profile read: its briefing is shown, asked again when another one is chosen
    const active = useActiveProfile();
    const location = useLocation();
    const navigate = useNavigate();

    const load = useCallback(async () => {
        try {
            const data = await BriefingApi.getLatest();
            if (expired(data)) return;
            if (data.error) throw new Error(data.error);
            setBriefing(data.briefing);
            setMail(Boolean(data.mail));
        } catch (err) {
            setError(err.message);
        }
    }, [expired]);

    // the profile says whether a briefing can be written at all
    useEffect(() => {
        if (!user) {
            logout();
            return;
        }
        setBriefing(undefined);
        setProfile(undefined);
        setChosen(null);
        setFollows(false);
        ProfileApi.get()
            .then(data => {
                if (expired(data)) return;
                setProfile(data.profile ?? null);
            })
            .catch(err => setError(err.message));
        // what it follows decides whether the tab of its news is of any use; without the answer, it is hidden
        EntityApi.list()
            .then(data => setFollows(Boolean(data?.entities?.some(entity => entity.inBriefing) || data?.words?.length > 0)))
            .catch(() => setFollows(false));
        load();
    }, [user, logout, expired, load, active]);

    // asked again while it is written
    useEffect(() => {
        if (briefing?.status !== 'running') return undefined;
        const timer = setTimeout(load, POLL_MS);
        return () => clearTimeout(timer);
    }, [briefing, load]);

    // the analysis written after the cards: asked again until it is, only it taken from the answer (the
    // reader may have voted or added a news meanwhile)
    useEffect(() => {
        if (briefing?.status !== 'ready' || briefing.analysis?.status !== 'running') return undefined;
        const id = briefing.id;
        const timer = setTimeout(async () => {
            try {
                const data = await BriefingApi.getLatest();
                if (expired(data) || data.error || data.briefing?.id !== id) return;
                setBriefing(current => current?.id === id ? {...current, analysis: data.briefing.analysis} : current);
            } catch {
                // asked again with the next change of the briefing
            }
        }, ANALYSIS_POLL_MS);
        return () => clearTimeout(timer);
    }, [briefing, expired]);

    // the cards that are one affair, asked once the briefing is ready: the AI names each (a few seconds), the cards
    // show it when it answers. A failure leaves the cards as they are
    const [affairs, setAffairs] = useState({});
    const readyId = briefing?.status === 'ready' ? briefing.id : null;
    useEffect(() => {
        setAffairs({});
        if (readyId === null) return undefined;
        let current = true;
        BriefingApi.affairs(readyId)
            .then(data => { if (current && !data.error) setAffairs(data.affairs ?? {}); })
            .catch(() => {});
        return () => { current = false; };
    }, [readyId]);

    // the other versions the other profiles of the account have of the cards, {storyId: [{briefingId, profile, createdAt, source}]}: asked
    // once the briefing is ready, and again after a card is replaced. A failure leaves the cards as they are, with no choice
    const [versions, setVersions] = useState({});
    const [versionBusy, setVersionBusy] = useState(null);
    const loadVersions = useCallback(async (id) => {
        try {
            const data = await BriefingApi.versions(id);
            if (!data.error) setVersions(data.versions ?? {});
        } catch {
            // no other version shown
        }
    }, []);
    useEffect(() => {
        setVersions({});
        if (readyId !== null) loadVersions(readyId);
    }, [readyId, loadVersions]);

    const start = async () => {
        setError(null);
        const data = await BriefingApi.start(hours, size);
        if (expired(data)) return;
        if (data.error) setError(data.error);
        else setBriefing(data.briefing);
    };

    const ticked = ticks.briefingId === briefing?.id ? ticks.storyIds : [];
    const tick = (storyIds) => setTicks({briefingId: briefing.id, storyIds});
    const tickOne = (storyId, checked) => tick(checked ? [...ticked, storyId] : ticked.filter(other => other !== storyId));

    // the cards ticked, in the order the reader gave them in the bar, with the pictures, titles and
    // sentences they changed, without the denials and angles they took out, their sentences in the way
    // chosen, sent to the address 'to': true when sent
    const email = async (to, storyIds, pictures, titles, removed, way, ai, texts, countries, theme, blocks) => {
        setSending(true);
        try {
            await BriefingApi.email(briefing.id, storyIds, to, pictures, titles, removed, way, ai, texts, countries, theme, blocks);
            // sent, they count as read: the next briefings leave them out unless something new happens
            toast.success(`${ticked.length === 1 ? 'The story' : `The ${ticked.length} stories`} sent to ${to}, read now for your next briefings.`);
            tick([]);
            return true;
        } catch (err) {
            toast.error(`Not sent: ${err.message}`);
            return false;
        } finally {
            setSending(false);
        }
    };

    // a news added at the end of the briefing and ticked for the e-mail, by its link or copied from another profile's briefing. A news copied from
    // another briefing comes with its analysis, shown as the cards' are; one read like a card has it written after the answer: the analysis shown
    // as running with the card among those picked, which the page then asks for until it is written. The ticks are changed from their last state:
    // several news copied one after the other from the editor of the e-mail are all ticked
    const showAdded = ({item, analysis, analyzing}) => {
        setBriefing(current => current && current.id === briefing.id ? {...current, items: [...current.items, item],
            ...(analysis && current.analysis?.status === 'ready' ? {analysis: {...current.analysis, cards: {...current.analysis.cards, [item.storyId]: analysis}}} : {}),
            ...(analyzing && current.analysis ? {analysis: {...current.analysis, status: 'running', picked: [...(current.analysis.picked ?? []), {storyId: item.storyId, reason: null}]}} : {})} : current);
        setTicks(current => ({briefingId: briefing.id, storyIds: [...(current.briefingId === briefing.id ? current.storyIds : []), item.storyId]}));
    };

    // a news added by its link: at the end of the briefing, ticked for the e-mail; true when added
    const addNews = async (url) => {
        try {
            showAdded(await BriefingApi.addNews(briefing.id, url));
            toast.success('The news was added at the end of the briefing, ticked for the e-mail.');
            return true;
        } catch (err) {
            toast.error(`Not added: ${err.message}`);
            return false;
        }
    };

    // what tells a version of a news from another in the message that asks the reader to choose (see MailSameNews): its medium, how many media tell
    // it and its first point, or the start of its sentences
    const versionOf = (card) => ({title: card.titleTranslation ?? card.title, source: card.lead?.source ?? null, media: card.corroboration?.media ?? null,
        excerpt: (card.ai?.points?.[0] ?? withoutOriginalMarks(card.pointsTranslation || card.points || card.digestTranslation || card.digest || card.translation || card.summary || '').split(/\n/)[0]).slice(0, 220)});

    // a news of the briefing of another profile (see MailImport, in the editor of the e-mail), copied as it is there: {storyId, title, source, media,
    // excerpt, similar} (similar: {storyId, number, title, source, media, excerpt}, the card of this briefing that tells the same news, null for none),
    // null when the server refused it
    const copyNews = async (fromBriefingId, storyId) => {
        try {
            const added = await BriefingApi.copyNews(briefing.id, fromBriefingId, storyId);
            if (added.error) throw new Error(added.error);
            const here = added.similar ? briefing.items.find(card => card.storyId === added.similar.storyId) : null;
            showAdded(added);
            if (!added.similar) toast.success('The news was added at the end of the briefing, ticked for the e-mail.');
            return {storyId: added.item.storyId, ...versionOf(added.item), similar: added.similar && {...added.similar, ...(here ? versionOf(here) : {})}};
        } catch (err) {
            toast.error(`Not added: ${err.message}`);
            return null;
        }
    };

    // two cards that tell the same news made one (see MailSameNews): the card 'keep' stays, with the card 'drop' among its angles and media, at the
    // place of the first of the two; the ticks follow (the one kept is ticked when either was), true when done
    const foldNews = async (keep, drop) => {
        try {
            const done = await BriefingApi.foldNews(briefing.id, keep, drop);
            if (done.error) throw new Error(done.error);
            setBriefing(current => {
                if (!current || current.id !== briefing.id) return current;
                const items = current.items.filter(card => card.storyId !== keep && card.storyId !== drop);
                items.splice(done.at, 0, done.item);
                const cards = current.analysis?.cards;
                return {...current, items, ...(cards?.[drop] ? {analysis: {...current.analysis, cards: Object.fromEntries(Object.entries(cards).filter(([id]) => Number(id) !== drop))}} : {})};
            });
            setTicks(current => {
                const now = current.briefingId === briefing.id ? current.storyIds : [];
                const on = now.includes(keep) || now.includes(drop);
                return {briefingId: briefing.id, storyIds: [...now.filter(id => id !== keep && id !== drop), ...(on ? [keep] : [])]};
            });
            toast.success('The two versions are one card now: the other is among its angles and media.');
            return true;
        } catch (err) {
            toast.error(`Not merged: ${err.message}`);
            return false;
        }
    };

    const removeNews = async (storyId) => {
        try {
            await BriefingApi.removeNews(briefing.id, storyId);
            setBriefing(current => current && ({...current, items: current.items.filter(item => item.storyId !== storyId),
                ...(current.analysis?.cards?.[storyId] ? {analysis: {...current.analysis, cards: Object.fromEntries(Object.entries(current.analysis.cards).filter(([id]) => Number(id) !== storyId))}} : {})}));
            tick(ticked.filter(other => other !== storyId));
        } catch (err) {
            toast.error(`Not taken out: ${err.message}`);
        }
    };

    // a card replaced where it stands by the version another profile has of its news (or taken back as its profile wrote it): the card and
    // its analysis come from the server, which keeps the card it replaced
    const changeVersion = async (storyId, ask, success) => {
        setVersionBusy(storyId);
        try {
            const {item, analysis} = await ask();
            setBriefing(current => current && current.id === briefing.id ? {...current, items: current.items.map(card => card.storyId === storyId ? item : card),
                ...(analysis && current.analysis?.status === 'ready' ? {analysis: {...current.analysis, cards: {...current.analysis.cards, [storyId]: analysis}}} : {})} : current);
            toast.success(success);
            await loadVersions(briefing.id);
        } catch (err) {
            toast.error(`Not changed: ${err.message}`);
        } finally {
            setVersionBusy(null);
        }
    };
    const takeVersion = (storyId, version) => changeVersion(storyId, () => BriefingApi.takeVersion(briefing.id, storyId, version.briefingId),
        `The card now shows ${version.profile ?? 'the other profile'}'s version of this news.`);
    const restoreVersion = (storyId) => changeVersion(storyId, () => BriefingApi.restoreVersion(briefing.id, storyId), 'The card is back as your profile wrote it.');

    // shown at once, taken back if the server refuses it
    const vote = async (storyId, value) => {
        const setVote = (to) => setBriefing(current => current && ({
            ...current,
            items: current.items.map(item => item.storyId === storyId ? {...item, vote: to} : item),
        }));
        const before = briefing.items.find(item => item.storyId === storyId)?.vote ?? null;
        setVote(value);
        try {
            await BriefingApi.vote(briefing.id, storyId, value);
        } catch (err) {
            setVote(before);
            setError(`The thumb was not saved: ${err.message}`);
        }
    };

    const running = briefing?.status === 'running';
    const ready = briefing?.status === 'ready';
    const count = ready ? briefing.items.length : 0;
    // what the tab of the news followed needs to put one in the e-mail (the user, 03.11.2026): the card that
    // tells it, or the news added as a card. Only for a reader who can send e-mails
    const mailAdd = useMemo(() => mail && ready ? {
        cardOf: news => cardTelling(briefing.items, news),
        numberOf: card => briefing.items.indexOf(card) + 1,
        isTicked: card => ticked.includes(card.storyId),
        tick: (card, checked) => tickOne(card.storyId, checked),
        add: news => addNews(news.url),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    } : null, [mail, ready, briefing, ticks]);
    // the stories naming a term the profile follows (item.found), shown alone on demand, the briefing as
    // written otherwise
    const found = ready ? briefing.items.filter(item => item.found?.length > 0).length : 0;
    const onlyFound = found > 0 && foundView === briefing.id;
    // a briefing written before the shorter ways (12.10.2026) has its key passages only
    const shorter = ready && briefing.items.some(item => item.digest);

    // the news of the terms the profile follows, in a tab of their own (#terms in the address, kept when
    // the page is opened again); none followed, the page has the briefing only. They are not part of the
    // briefing: they are searched when the tab is opened, whatever the briefing written
    const hasTerms = follows;
    // the affairs followed, in a tab of their own (#affairs): there when the reader follows one, or a card of the briefing is one
    // they could follow. The page of each is /affairs/:id
    const followedAffairs = useFollowed(Boolean(user));
    const hasAffairs = followedAffairs > 0 || Object.keys(affairs).length > 0;
    const tab = hasTerms && location.hash === '#terms' ? 'terms' : hasAffairs && location.hash === '#affairs' ? 'affairs' : 'briefing';
    const following = useFollowing(tab === 'terms', watchLimit, active, expired);
    const watchedCount = following.groups ? following.groups.reduce((sum, group) => sum + group.count, 0) : null;
    // the titles of the news of the terms in another language than the reader's, translated as the rows come
    // near the screen; one translator for the language, the translations had are kept across the tabs
    const readerLanguage = profile?.language ?? null;
    const translator = useMemo(() => readerLanguage
        ? createTranslator(readerLanguage, asked => SearchApi.translateNews(asked, readerLanguage).then(data => data?.translations ?? []))
        : null, [readerLanguage]);
    const chooseTab = (value) => navigate({pathname: location.pathname, search: location.search, hash: value === 'terms' ? '#terms' : value === 'affairs' ? '#affairs' : ''}, {replace: true});
    // the stories of the briefing naming a term, shown alone in the tab of the briefing
    const showFound = () => {
        setFoundView(briefing.id);
        chooseTab('briefing');
    };

    const cards = (
        <>
            {found > 0 && (
                <div className="grid-12">
                    <div className="col-span-12 flex flex-wrap items-baseline gap-x-4 gap-y-2 md:col-span-9">
                        <Button size="sm" variant={onlyFound ? 'primary' : 'quiet'} aria-pressed={onlyFound}
                                onClick={() => setFoundView(onlyFound ? null : briefing.id)}>
                            {onlyFound ? 'Show the whole briefing' : `What you follow, found · ${found} ${found === 1 ? 'story' : 'stories'}`}
                        </Button>
                        <p className="caption">
                            {onlyFound
                                ? 'Only the stories that name something you follow, marked where they are.'
                                : 'The stories that name something you follow.'}
                        </p>
                    </div>
                </div>
            )}

            {ready && count > 0 && (
                <ol className="list-none p-0 max-md:[&>li:first-child>article]:border-t-0 max-md:[&>li:first-child>article]:pt-0">
                    {/* on a phone the bar of the tools has its line under it: the first card has none over it (the user, 05.11.2026: two lines).
                        The stories of the terms followed keep their place in the briefing */}
                    {briefing.items.map((item, index) => (!onlyFound || item.found?.length > 0) && (
                        <li key={item.storyId} id={`card-${item.storyId}`} className="scroll-mt-6">
                            <BriefingCard item={item} number={index + 1} lede={index === 0 && !onlyFound} marked={onlyFound} format={format} show={shown}
                                          analysis={briefing.analysis?.cards?.[item.storyId]} analysisModel={briefing.analysis?.model}
                                          analysisPending={briefing.analysis?.status === 'running'
                                              && (briefing.analysis.picked ?? []).some(entry => entry.storyId === item.storyId)}
                                          affair={affairs[item.storyId]} briefingId={briefing.id}
                                          versions={versions[item.storyId]} versionBusy={versionBusy === item.storyId}
                                          onUseVersion={item.imported ? undefined : version => takeVersion(item.storyId, version)}
                                          onRestoreVersion={item.imported ? undefined : () => restoreVersion(item.storyId)}
                                          onVote={item.imported ? undefined : value => vote(item.storyId, value)}
                                          onRemove={item.imported && mail ? () => removeNews(item.storyId) : undefined}
                                          onSelect={mail ? checked => tickOne(item.storyId, checked) : undefined}
                                          selected={ticked.includes(item.storyId)}/>
                        </li>
                    ))}
                </ol>
            )}
        </>
    );

    const terms = hasTerms && (
        <div className="grid-12">
            <section className="col-span-12 md:col-span-9" aria-labelledby="watched-head">
                <h2 id="watched-head" className="section-head">What you follow</h2>
                <p className="caption mt-2">
                    The news of your sources that name one, whatever their relevance, not chosen by the AI. They are searched
                    when you open this tab, back to 30 days until each has the number you want. <Link className="link" to="/following">Change them</Link>.
                </p>
                {/* for a reader who can send e-mails: where the button of each news is, and what it needs */}
                {mail && (
                    <p className="caption mt-1">
                        {ready
                            ? 'Under each news, “Add to the e-mail” puts it in the e-mail of your briefing (or ticks its card if the briefing tells it already): the bar to send it comes at the bottom of the page.'
                            : 'To put these news in an e-mail, write a briefing first: they are added to it.'}
                    </p>
                )}
                {ready && found > 0 && (
                    <p className="caption mt-1">
                        <button type="button" onClick={showFound} className="cursor-pointer text-action-text hover:underline underline-offset-4">
                            {found === 1 ? '1 story of your briefing names them' : `${found} stories of your briefing name them`}
                        </button>
                    </p>
                )}
                <div className="mt-6">
                    <MailAddContext.Provider value={mailAdd}>
                        <FollowingNews following={following} limit={watchLimit} onLimit={chooseWatchLimit} translator={translator}/>
                    </MailAddContext.Provider>
                </div>
            </section>
        </div>
    );

    // how the cards are read, in a pill of the toolbar while the tab of the briefing is read (the three presets of what the cards show are gone,
    // the user, 10.11.2026: what they show is ticked in the settings): a briefing written before the shorter ways has nothing to choose
    const viewLabel = FORMATS.find(one => one.value === format)?.label;
    const reading = tab === 'briefing' && ready && count > 0 && shorter && (
        <SettingsPill label={viewLabel} ariaLabel={`How the cards are read: ${viewLabel}. Change`} wide
                      icon={<Eye aria-hidden className="size-3.5 text-ink-mute" strokeWidth={1.75}/>}>
            <BriefingFormat format={format} onChange={chooseFormat}/>
            <p className="caption">What each card shows: <Link className="link" to="/settings">your settings</Link>.</p>
        </SettingsPill>
    );
    // what the briefing offers for the e-mail, a round icon each in the toolbar (the user, 05.11.2026: a form took a band of the page): ticking
    // every story, a news added by its link. The AI analysis has none: it is seen on the story itself
    const allTicked = ready && count > 0 && briefing.items.every(item => ticked.includes(item.storyId));
    const tools = tab === 'briefing' && ready && mail && (
        <div className="flex flex-wrap items-center gap-0.5 max-md:gap-1.5">
            {count > 0 && (
                <ToolButton label={allTicked ? 'Untick all the stories' : 'Tick all the stories'} pressed={allTicked} text={allTicked ? 'Untick all' : 'Tick all'}
                            title={allTicked ? 'Untick all the stories' : 'Tick all the stories, to send them by e-mail'}
                            onClick={() => tick(allTicked ? [] : briefing.items.map(item => item.storyId))}>
                    <ListChecks aria-hidden className="size-4"/>
                </ToolButton>
            )}
            <ToolPopover icon={<Link2 aria-hidden className="size-4"/>} text="Add a news" label="Add a news by its link">
                {close => (
                    <AddNews key={briefing.id} onAdd={async url => {
                        const added = await addNews(url);
                        if (added) close();
                        return added;
                    }}/>
                )}
            </ToolPopover>
        </div>
    );
    // the next briefing: shown while the profile is asked too (it came after the briefing, and the controls
    // appearing then pushed the cards down, the user 16.10.2026); none without a profile
    // its days and cards, kept from a briefing to the next, in a panel the pill opens: beside the tabs and the
    // way to read, they took the toolbar to two lines on a laptop (the user, 01.11.2026)
    const next = profile !== null && (
        <div className="flex flex-wrap items-center gap-3">
            <SettingsPill label={`${spanOf(hours)} · ${size} cards`} title="Next briefing"
                          ariaLabel={`Next briefing: the news of the last ${spanOf(hours)}, ${size} cards. Change`}>
                <BriefingWindow hours={hours} onChange={setChosen} disabled={running}/>
                <BriefingSize size={size} onChange={chooseSize} disabled={running}/>
            </SettingsPill>
            <Button variant="primary" size="sm" onClick={start} loading={running} disabled={running}>
                New briefing
            </Button>
        </div>
    );
    const tabs = (hasTerms || hasAffairs) && (
        <Tabs.List aria-label="Your briefing, what you follow and your affairs" className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-paper-deep p-1 [scrollbar-width:none]">
            <Tabs.Trigger value="briefing" className={PAGE_TAB}>Briefing</Tabs.Trigger>
            {hasTerms && (
                <Tabs.Trigger value="terms" className={PAGE_TAB}>
                    Following{watchedCount !== null && <> <span className="tabular-nums text-ink-mute">{watchedCount}</span></>}
                </Tabs.Trigger>
            )}
            {hasAffairs && (
                <Tabs.Trigger value="affairs" className={PAGE_TAB}>
                    Affairs{followedAffairs > 0 && <> <span className="tabular-nums text-ink-mute">{followedAffairs}</span></>}
                </Tabs.Trigger>
            )}
        </Tabs.List>
    );

    return (
        <PageShell user={user} onSignOut={logout}>
            <Opening
                kicker="The briefing"
                title="Your briefing"
                standfirst="The stories of the last 1 to 7 days closest to your interests, chosen by the AI. A story you sent by e-mail in the last two days counts as read: it comes back only when something new happened."
            />

            {/* the briefing and the news of the terms followed, one tab each, the briefing first; without a
                term followed, the page has the briefing only and no tab */}
            <Tabs.Root value={tab} onValueChange={chooseTab}>
                <div className="page mt-8">
                    <p className="caption min-h-[1.45em]">
                        {ready && <>
                            Written {written(briefing.finishedAt ?? briefing.createdAt)} · The news of the
                            last {spanOf(briefing.hours ?? DEFAULT_HOURS)}{count > 0 && `, ${count} ${count === 1 ? 'story' : 'stories'}`}
                        </>}
                    </p>
                </div>

                {/* one bar for what the page shows and for the next briefing; the tab of what is followed has
                    no briefing to write (the user, 01.11.2026): its own bar for the news wanted is in it */}
                {(tabs || next || tools) && (
                    <Toolbar>
                        {tabs}
                        {reading}
                        {tab === 'briefing' && (tools || next) && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-3 gap-y-2 md:ml-auto">{tools}{next}</div>}
                    </Toolbar>
                )}

                {/* room under the last card for the bar of the e-mail */}
                <div className={`page mt-10 space-y-8 md:mt-12${ticked.length > 0 ? ' pb-20' : ''}`}>
                    <div className="grid-12">
                        <div className="col-span-12 space-y-8 empty:hidden md:col-span-9">
                            {/* a briefing written before the shorter ways (12.10.2026): nothing to choose in the toolbar */}
                            {tab === 'briefing' && ready && count > 0 && !shorter && (
                                <p className="caption">Bullet points and a short summary come with your next briefing: this one has its key passages only.</p>
                            )}

                            {error && <Notice type="error" onClose={() => setError(null)}>{error}</Notice>}

                            {profile === null && (
                                <Notice title="First, your profile">
                                    Tell us what you want to read first: <Link className="link" to="/profile">write your profile</Link>.
                                    The briefing is chosen from it, and the sources are found for it.
                                </Notice>
                            )}

                            {briefing === undefined && !error && <Working>Opening your briefing…</Working>}

                            {running && <Working>{steps(spanOf(briefing.hours ?? DEFAULT_HOURS))[briefing.step] ?? 'Working…'}</Working>}

                            {briefing?.status === 'failed' && (
                                <Notice type="error">The last briefing could not be written: {briefing.error}</Notice>
                            )}

                            {ready && count === 0 && (
                                <Notice title="Nothing today">
                                    No story of the last {spanOf(briefing.hours ?? DEFAULT_HOURS)} really fits your profile. A short briefing is better than an off-topic one:
                                    try again later, or <Link className="link" to="/profile">widen your profile</Link>.
                                </Notice>
                            )}
                        </div>
                    </div>

                    <Tabs.Content value="briefing" className="space-y-8 outline-none">{cards}</Tabs.Content>
                    {hasTerms && <Tabs.Content value="terms" className="outline-none">{terms}</Tabs.Content>}
                    {hasAffairs && (
                        <Tabs.Content value="affairs" className="outline-none">
                            <section aria-labelledby="affairs-head">
                                <h2 id="affairs-head" className="section-head">The affairs you follow</h2>
                                <p className="caption mt-2 max-w-[60ch]">
                                    A story told over days. You are told as soon as it has a new fact, told by several media: not every article, not an opinion.
                                </p>
                                <AffairList/>
                            </section>
                        </Tabs.Content>
                    )}

                    {/* the cards ticked are sent from the bar, in the tab of the briefing and in the one of what you follow, where a
                        news is put in the e-mail (the user, 03.11.2026: the bar was not there after "Add to the e-mail") */}
                    {mail && ready && ticked.length > 0 && (
                        <MailBar accountEmail={user?.email} sending={sending} onSend={email} onClear={() => tick([])}
                                 onPreview={payload => BriefingApi.emailPreview(briefing.id, payload)}
                                 format={shorter ? format : null}
                                 onPictures={storyId => BriefingApi.pictures(briefing.id, storyId)}
                                 onNeutralTitle={storyId => BriefingApi.neutralTitle(briefing.id, storyId)}
                                 onProfilesNews={() => BriefingApi.profilesNews(briefing.id)} onCopyNews={copyNews} onFoldNews={foldNews}
                                 stories={briefing.items.flatMap((item, index) => ticked.includes(item.storyId)
                                     ? [{storyId: item.storyId, title: item.titleTranslation ?? item.title, number: index + 1,
                                         // the title as the medium wrote it, when the card's was shortened or rewritten (the editor offers it), and its language
                                         titleAsPublished: item.titleAsPublished ?? null, titleLanguage: item.language ?? null, titleTranslated: Boolean(item.titleTranslation),
                                         // the rewrite the AI wrote when the card was made, that the checks refused: the editor shows it with what they found
                                         titleProposal: item.titleProposal ?? null,
                                         thumbnail: item.thumbnail ?? null, thumbnailSource: item.thumbnailSource ?? null,
                                         countries: item.countries ?? [],
                                         contested: item.contested ?? [],
                                         // what the editor of the e-mail offers to put in it (see mailBlocks.js)
                                         names: (item.names ?? []).map(name => name.name), hedged: Boolean(item.hedged), media: item.corroboration?.media ?? 0,
                                         affair: Boolean(affairs[item.storyId]), hasArticles: (item.articles?.length ?? 0) > 0,
                                         ai: item.ai ?? null,
                                         own: {points: withoutOriginalMarks(item.pointsTranslation || item.points || null), digest: withoutOriginalMarks(item.digestTranslation || item.digest || null),
                                             passages: withoutOriginalMarks(item.translation || item.summary || null)},
                                         analysis: briefing.analysis?.status === 'ready' ? briefing.analysis.cards?.[item.storyId] ?? null : null,
                                         angles: (item.angles ?? []).map(angle => ({title: angle.titleTranslation ?? angle.title, source: angle.source})),
                                         official: (item.official ?? []).map(post => ({party: post.party, title: post.translation ?? post.title}))}] : [])}/>
                    )}
                </div>
            </Tabs.Root>
        </PageShell>
    );
};
