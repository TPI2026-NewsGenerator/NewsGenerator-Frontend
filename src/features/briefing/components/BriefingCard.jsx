//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: BriefingCard.jsx
//  Description: One story of the briefing: why it was chosen, its summary, how widely it is told, who denies it, its other
//               angles, and the post where a party of the news said it itself, then the link to its article at the very bottom
//

import {Fragment, useState} from "react";
import {Link} from "react-router-dom";
import {CircleHelp, Megaphone, Radio, TriangleAlert} from "lucide-react";
import {FaRegThumbsDown, FaRegThumbsUp, FaThumbsDown, FaThumbsUp} from "react-icons/fa";
import {IconButton} from "@/components/ui/button.jsx";
import {Notice} from "@/components/ui/text.jsx";
import {NewsLinks} from "@/components/news/NewsLinks.jsx";
import {LanguageMark} from "@/components/news/LanguageMark.jsx";
import {Marked} from "@/components/news/Marked.jsx";
import {ORIGINAL_START, UNCHECKED, paragraphsWithMarks} from "@/features/briefing/marks.js";
import {InfoTip} from "@/components/ui/info-tip.jsx";
import {Checkbox} from "@/components/ui/field.jsx";
import {Switch} from "@/components/ui/switch.jsx";
import {languageLabel} from "@/features/briefing/profileWords.js";
import {fieldsOf} from "@/features/briefing/formats.js";
import {aiFirstPreference} from "@/features/briefing/aiFirst.js";
import {usePreference} from "@/features/preferences/usePreference.js";
import {countryNames} from "@/features/briefing/countries.js";
import {CardAnalysis} from "@/features/briefing/components/BriefingAnalysis.jsx";
import {AffairPanel, AffairRail} from "@/features/affairs/components/AffairSection.jsx";
import {CardCoverage} from "@/features/briefing/components/CardCoverage.jsx";
import {CardMore} from "@/features/briefing/components/CardMore.jsx";
import {cn, capitalized} from "@/lib/utils.js";
import {pageOf} from "@/features/entities/entityApi.js";

// Passages of an article, a gap between two of them: the sentences are the article's own, the AI only
// chose them (see server/services/utils/extract.js). paragraphs: [{text, marks}] (see marks.js)
const Passages = ({paragraphs, lede, className}) => paragraphs.map((paragraph, i) => (
    <Fragment key={i}>
        {i > 0 && <p aria-hidden className="text-ink-mute">[…]</p>}
        <p className={cn(lede && i === 0 && 'lede', className)}><Marked text={paragraph.text} marks={paragraph.marks}/></p>
    </Fragment>
));

// The summary of 5 to 6 lines: the same, in one paragraph, the gaps marked inside it
const Digest = ({paragraphs, lede}) => (
    <p className={cn(lede && 'lede')}>
        {paragraphs.map((paragraph, i) => (
            <Fragment key={i}>
                {i > 0 && <span aria-hidden className="text-ink-mute"> […] </span>}
                <Marked text={paragraph.text} marks={paragraph.marks}/>
            </Fragment>
        ))}
    </p>
);

// The bullet points: a sentence each, the most important first
const Points = ({paragraphs}) => (
    <ul className="list-disc space-y-2 pl-5 marker:text-ink-mute">
        {paragraphs.map((paragraph, i) => <li key={i}><Marked text={paragraph.text} marks={paragraph.marks}/></li>)}
    </ul>
);

// the sentences of a card in the way the reader chose (see formats.js)
const WAYS = {passages: Passages, digest: Digest, points: Points};

// The points or the summary written by the AI (see server/services/utils/ai-ways.js), shown under the
// article's own sentences when the reader asks for it, for the readers to compare the two. text: the
// points ['...'] or the summary '...'; model: the model that wrote it
const AiVersion = ({id, format, text, model, source}) => (
    <div id={id} className="mt-6 rounded-2xl bg-paper-deep px-5 py-4">
        <p className="section-title !text-accent-ink">Written by the AI</p>
        <div className="body-text mt-3">
            {format === 'points'
                ? <Points paragraphs={text.map(point => ({text: point}))}/>
                : <p>{text}</p>}
        </div>
        <p className="footnote mt-3">
            Written by the AI{model ? ` (${model.replace(/:.*$/, '')})` : ''} from the article {source && <>of {source} </>}in its own words: it can get a
            fact wrong. The article's sentences above are the reference.
        </p>
    </div>
);

// the dot after a meta of the line over the title, on a phone
const DOT = "after:ml-2 after:text-[0.8125rem] after:text-ink-mute/60 after:content-['·'] md:after:content-none";

const when = (at) => new Date(at).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});

// What an article quotes, in the language of the reader: the machine translation when it is written in
// another one, said so, the sentence as written shown on demand, as the title of the card is (the user,
// 02.11.2026: everything in the language of the reader, the original never first). original: the card's
// "Show original" is open, which opens it here too; id: the original's place on the page
const Translated = ({original: opened, language, id, className, children}) => {
    const [own, setOwn] = useState(null);
    const original = own ?? opened;
    return (
        <>
            <p className={cn('caption mt-1 flex flex-wrap items-baseline gap-x-3', className)}>
                <span>Machine translation from {languageLabel(language)}</span>
                <button type="button" onClick={() => setOwn(!original)} aria-expanded={original} aria-controls={id}
                        className="cursor-pointer text-action-text hover:underline underline-offset-4">
                    {original ? 'Hide original' : 'Show original'}
                </button>
            </p>
            {original && <p id={id} lang={language ?? undefined} className="caption mt-1 italic">“{children}”</p>}
        </>
    );
};

// Someone named who denies the news, in the words of one of its articles, translated into the reader's
// language when written in another (see server/services/utils/contested.js). Nobody is said to be right:
// the reader is told who denies, and where it is written. In the column beside the card, under the badge "Contested" that leads to it
const CONTESTED_NOTE = 'One of its articles reports that someone named denies this news. The sentence is the article’s own, found by the AI; it does not say who is right.';
const Contested = ({id, denials, original}) => (
    <div id={id} className="scroll-mt-24">
        <p className="section-title !text-[1rem] !text-accent-ink">
            Contested
            <InfoTip label="Contested">{CONTESTED_NOTE}</InfoTip>
        </p>
        <ul className="caption mt-1 max-w-[32ch] space-y-3 !text-ink">
            {denials.map((denial, i) => (
                <li key={denial.url + denial.sentence}>
                    <p>{denial.by} denies:{' '}
                        “{denial.translation
                            ? <Marked text={denial.translation} marks={denial.marks?.translation}/>
                            : <span lang={denial.language ?? undefined}><Marked text={denial.sentence} marks={denial.marks?.sentence}/></span>}”
                    </p>
                    {denial.translation && (
                        <Translated original={original} language={denial.language} id={`denial-${i}-${denial.url}`}>
                            <Marked text={denial.sentence} marks={denial.marks?.sentence}/>
                        </Translated>
                    )}
                    <p className="caption mt-1">
                        — <a href={denial.url} target="_blank" rel="noreferrer" className="medium-link">{denial.source}</a>
                        {denial.publishedAt && <>, <time dateTime={denial.publishedAt}>{when(denial.publishedAt)}</time></>}
                    </p>
                </li>
            ))}
        </ul>
    </div>
);

// News of the same affair that tell something the card does not: an earlier or later step, a reaction,
// another party's view (see server/services/utils/other-angles.js). The title translated when written
// in another language than the reader's, the original shown with the card's
const ANGLES_NOTE = 'Close news of the last days, in any language, that the AI read as the same affair seen from another side: what came before or after, a reaction, a background. Judged from their titles: one may only be close.';
const OtherAngles = ({angles, original}) => (
    <div>
        <p className="section-title">
            Same affair, other angles
            <InfoTip label="Same affair, other angles">{ANGLES_NOTE}</InfoTip>
        </p>
        <ul className="mt-2 space-y-3">
            {angles.map(angle => (
                <li key={angle.url} className="panel-text">
                    <a href={angle.url} target="_blank" rel="noreferrer" title={angle.titleTranslation ? angle.title : undefined}
                       className="panel-link">
                        {angle.titleTranslation
                            ? <Marked text={angle.titleTranslation} marks={angle.marks?.titleTranslation}/>
                            : <Marked text={angle.title} marks={angle.marks?.title}/>}
                    </a>
                    {original && angle.titleTranslation && (
                        <p lang={angle.language ?? undefined} className="caption mt-1 italic">“<Marked text={angle.title} marks={angle.marks?.title}/>”</p>
                    )}
                    <p className="caption mt-1">
                        {angle.source}
                        {angle.language && <LanguageMark code={angle.language}/>}
                        {angle.publishedAt && <> · <time dateTime={angle.publishedAt}>{when(angle.publishedAt)}</time></>}
                        {angle.media > 1 && <> · told by {angle.media} media</>}
                    </p>
                </li>
            ))}
        </ul>
    </div>
);

// The posts where a party the news is about (a club, a body, a company) said it itself, on its website
// or an open account of its own, found and read by the AI (see server/services/utils/official-sources.js).
// Its title is the party's own, translated into the reader's language when it is in another (briefings
// since 18.10.2026). Or its statement one of the card's articles reports (channel 'reported', see
// statements.js): the sentence quoted in the reader's language, the original on demand
const OFFICIAL_NOTE = 'A party this news is about said it itself: published on its own website or account, as Wikidata lists them, or in a statement one of the articles reports, quoted as written. Found and read by the AI, which may be wrong: the link is the reference. X and Instagram can’t be read, so most news have none.';
const OfficialSource = ({id, posts, original}) => (
    <Margin id={id} tone="official" kicker={<>Official sources <InfoTip label="Official sources">{OFFICIAL_NOTE}</InfoTip></>}>
        <ul className="space-y-2">
            {posts.map((post, i) => post.channel === 'reported' ? (
                <li key={post.url + post.party}>
                    {post.party} said it, reported by{' '}
                    <a href={post.url} target="_blank" rel="noreferrer" className="panel-link">{post.source}</a>:{' '}
                    <span lang={post.translation ? undefined : post.language ?? undefined}>“{post.translation ?? post.title}”</span>
                    {post.translation && (
                        <Translated original={original} language={post.language} id={`official-${i}-${post.url}`} className="!text-ink-mute">
                            {post.title}
                        </Translated>
                    )}
                </li>
            ) : (
                <li key={post.url}>
                    {post.party} said it:{' '}
                    <a href={post.url} target="_blank" rel="noreferrer" title={post.translation ? post.title : undefined}
                       className="panel-link">{post.translation ?? post.title}</a>
                    {post.publishedAt && <span className="text-ink-mute">, <time dateTime={post.publishedAt}>{when(post.publishedAt)}</time></span>}
                </li>
            ))}
        </ul>
    </Margin>
);

// The picture of one of its articles, the site it is of under it. Asked without the address of the page
// (some sites refuse their pictures to other sites), and left out when it can't be loaded. illustration:
// the picture of Wikimedia Commons of who it names, not of the news, said so; a portrait cut nearer its
// top, where the face is
const Picture = ({src, source, illustration = false}) => {
    const [failed, setFailed] = useState(false);
    if (failed) return null;
    return (
        <figure className="m-0 mt-5">
            <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)}
                 className={`aspect-[16/9] w-full rounded-[18px] bg-paper-deep object-cover ${illustration ? 'object-[50%_25%]' : ''}`}/>
            {source && <figcaption className="caption mt-1.5">{illustration ? 'Illustration' : 'Picture'} — {source}</figcaption>}
        </figure>
    );
};

// What the AI did to a title it rewrote (the user, 03.11.2026), told by the "i" next to "Title rewritten by the AI"
const REWRITTEN_NOTE = 'The AI judged that this title carried a judgment or an emphasis of its medium, rewrote it, and a second check found that it tells exactly the same fact. The title as published is one click away. A word can still be lost: the sentences of the card are the reference.';

// A card sent by e-mail in the last two days it follows (see server/services/utils/repeats.js): the same
// story with news since, read from them, or a new step of its affair. followUp: {title, shownAt, evolved}
const FOLLOW_UP_NOTE = 'A story you sent by e-mail in the last two days counts as read: it is not shown again, unless news published since tell something new. Judged by the AI from their titles.';
const day = (at) => new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'});
const FollowUp = ({followUp}) => (
    <div className="rounded-xl border border-action/30 bg-action/10 px-3.5 py-3">
        <p className="section-title !text-[1rem] !text-action-text">Follow-up <InfoTip label="Follow-up">{FOLLOW_UP_NOTE}</InfoTip></p>
        <div className="caption mt-1 max-w-[32ch] !text-action-text">
            {followUp.evolved ? 'New since you read it' : 'A new step of the affair you read'}, sent on {day(followUp.shownAt)}: “{followUp.title}”
        </div>
    </div>
);

// a note of the outer column: its kicker and what it says, the one way the column is written in (13 px, regular: the follow-up, the
// denials, the affair, the checkboxes). id: its place on the page, where the badge of the glance leads
const Margin = ({id, kicker, tone, children}) => (
    <div id={id} className="scroll-mt-24">
        <p className={cn('section-title !text-[1rem]', tone === 'accent' && '!text-accent-ink', tone === 'official' && '!text-official')}>{kicker}</p>
        <div className="caption mt-1 max-w-[32ch] !text-ink">{children}</div>
    </div>
);

// A badge of the glance: what the reader should see at once, without opening anything. tone 'warn' (orange) for what is said against the
// news or what the article itself says is not confirmed, 'official' (green) for what a party said itself
const BADGE_TONES = {
    warn: 'border-accent-ink/30 bg-accent-ink/10 text-accent-ink hover:bg-accent-ink/15',
    official: 'border-official/30 bg-official/10 text-official hover:bg-official/15',
};
const Badge = ({icon, tone, onClick, children}) => (
    <button type="button" onClick={onClick}
            className={cn('inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors', BADGE_TONES[tone])}>
        {icon}
        {children}
    </button>
);

// Under the title, what matters before reading: how widely it is told (its pill opens the coverage), then a badge for each of: someone
// who denies it, a party that said it itself, an article that says itself it is not confirmed (the user, 05.11.2026). A badge leads
// to its words in the column beside the card. onOpen(key): a tab; onNote(kind): the note of the column
// on(block): whether the preset the page is in shows the block; the number of media opens the coverage when that tab is there
const Glance = ({item, onOpen, onNote, on = () => true}) => {
    const media = on('media') ? item.corroboration?.media ?? 0 : 0;
    const languages = new Set((item.articles ?? []).map(article => article.language).filter(Boolean)).size;
    const contested = on('contested') ? item.contested?.length ?? 0 : 0;
    const official = on('official') ? item.official?.length ?? 0 : 0;
    const hedged = on('unconfirmed') && item.hedged;
    if (media === 0 && contested === 0 && official === 0 && !hedged) return null;
    const told = `${media === 1 ? 'Told by one medium' : `Told by ${media} media`}${languages > 1 ? ` in ${languages} languages` : ''}`;
    return (
        <div className="mt-3 flex flex-wrap items-center gap-2">
            {media > 0 && (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-transparent bg-paper-deep px-3.5 py-1.5 text-[0.8125rem] text-ink-mute">
                    <Radio aria-hidden className="size-3.5 shrink-0"/>
                    {on('coverage') ? (
                        <button type="button" onClick={() => onOpen('coverage')} className="cursor-pointer underline-offset-4 hover:text-ink hover:underline">{told}</button>
                    ) : told}
                </span>
            )}
            {contested > 0 && <Badge icon={<TriangleAlert aria-hidden className="size-3.5 shrink-0"/>} tone="warn" onClick={() => onNote('contested')}>{contested === 1 ? 'Contested' : `Contested (${contested})`}</Badge>}
            {official > 0 && <Badge icon={<Megaphone aria-hidden className="size-3.5 shrink-0"/>} tone="official" onClick={() => onNote('official')}>Officially confirmed</Badge>}
            {hedged && <Badge icon={<CircleHelp aria-hidden className="size-3.5 shrink-0"/>} tone="warn" onClick={() => onNote('unconfirmed')}>Unconfirmed</Badge>}
        </div>
    );
};

// onVote(vote): 'up', 'down', or null when the reader takes back the thumb given. The next briefings
// learn from it; without onVote no thumb is shown. number: its place in the briefing. lede: the first
// story of the page, whose passages open with the drop cap. item.summary: the key sentences of the
// article as published, a paragraph per passage; item.translation: their machine translation.
// item.titleTranslation: the title in the language of the reader, when written in another (item.language).
// item.titleRewritten: the AI rewrote the title (a judgment inside its sentences), item.titleAsPublished is the title as the medium
// wrote it, shown on demand with a button of its own, not the "Show original" of the translation; absent before 03.11.2026.
// item.lead: the article of the title and the passages, absent from the briefings made before it was
// sent: their first article then. item.contested: who denies the news, quoted, absent from the older ones.
// item.angles: news of the same affair telling something else, absent from the older ones.
// item.official: [{party, title, url, channel, publishedAt}] the posts where a party said it itself, then
// its statements an article reports (channel 'reported', with source, translation, language), absent from the older ones.
// item.names: [{name, qid, kind}] the people and organisations most of its articles name, each opening its page (the one
// of its item of Wikidata, else the one of the name as written), absent from the briefings before 13.10.2026.
// item.countries: the codes ISO 3166-1 of the countries of who and where it names, the main first, shown
// under its topic, absent from the briefings before 18.10.2026.
// item.marks (and the marks of its angles and denials): {field: [[start, end]]}, the places of the terms
// the profile follows in its texts; item.found: [{term, angle}] the terms it names, angle when only one
// of its other angles does. marked: they are shown, with the terms found; else the card is as written
// item.thumbnail: the picture of one of its articles, item.thumbnailSource its site (absent from the older ones);
// else its illustration (item.illustration: {url, credit...}, the picture of Wikimedia Commons of who it names).
// onSelect(checked): the card ticked or not for the e-mail, selected says it is; without onSelect no box is shown
// format: the way the sentences are shown, 'passages', 'digest' or 'points' (see formats.js); item.points,
// item.digest and their translations are of the same sentences as published, absent from the older ones.
// item.ai: {points, summary, model} the same ways written by the AI, shown on demand (see AiVersion).
// analysis: the AI analysis of the card when it merits one (see CardAnalysis), analysisPending while it is
// written, analysisModel the model writing it
// affair: {title, stories, media} when the card is one affair (see AffairSection), with briefingId, the briefing it is in
// item.followUp: the card of the last days it follows (see FollowUp); item.imported: a news the reader
// added by its link, for the e-mail; item.transferred: that card copied from another briefing of the reader
const unmarked = (entry) => ({...entry, marks: undefined});
// onRemove: a news the reader added taken out of the briefing
// show: the blocks the page shows of the card, the ones of its preset (see mailBlocks.js BLOCKS): all of them without it
export const BriefingCard = ({item: given, onVote, onSelect, onRemove, selected = false, number, lede = false, marked = false, format = 'passages',
                                 analysis, analysisPending = false, analysisModel, affair, briefingId, show}) => {
    const on = (block) => !show || show.includes(block);
    const item = marked ? given : {...unmarked(given), angles: given.angles?.map(unmarked), contested: given.contested?.map(unmarked)};
    const lead = item.lead ?? item.articles[0];
    // the terms the profile follows, marked where they are (see marks.js)
    const marks = item.marks ?? {};
    const fields = fieldsOf(item, format);
    const Way = WAYS[fields.text === 'summary' ? 'passages' : format];
    const paragraphs = paragraphsWithMarks(item[fields.text], marks[fields.text]);
    const translation = paragraphsWithMarks(item[fields.translation], marks[fields.translation]);
    // the translation is shown, the original only when the reader opens it
    const translated = Boolean(item.titleTranslation) || translation.length > 0;
    const [original, setOriginal] = useState(false);
    // its title without the bait of its medium (item.titleAsPublished is the title as it was, see the server's
    // neutral-titles.js), shown as published on demand
    const [asPublished, setAsPublished] = useState(false);
    // the AI version of the points or the summary, absent from the key passages and the briefings before 15.10.2026
    const aiText = format === 'points' ? item.ai?.points : format === 'digest' ? item.ai?.summary : null;
    // on at first, as the reader chose in the settings (aiFirst), until they switch this card
    const [aiFirst] = usePreference(aiFirstPreference);
    const [aiChosen, setAiChosen] = useState(null);
    const showAi = aiChosen ?? aiFirst;
    // a switch in the row of the title of the sentences (the user, 06.11.2026: a link under them was not understood): put on, the AI version is shown under them
    const aiSwitch = paragraphs.length > 0 && aiText && (
        <Switch checked={showAi} onCheckedChange={setAiChosen} aria-controls={`ai-${item.storyId}`}
                title="The version the AI wrote of these sentences, shown under them for you to compare">
            AI version
        </Switch>
    );
    // what lies around the news, one strip under it (see CardMore); the glance and the link row open one
    // none chosen yet: the first tab is the one open (the user, 05.11.2026); once the reader opens one, or closes it, theirs stands
    const [chosen, setChosen] = useState(undefined);
    const openMore = (key) => {
        setChosen(key);
        requestAnimationFrame(() => document.getElementById(`card-${given.storyId}-${key}`)?.scrollIntoView({block: 'nearest', behavior: 'smooth'}));
    };
    // a badge of the glance leads to its words in the column beside the card (below the card on a phone)
    const showNote = (kind) => document.getElementById(`card-${given.storyId}-${kind}`)?.scrollIntoView({block: 'center', behavior: 'smooth'});
    // the affair the reader follows: what the server said when the card was shown, then what they did on it
    const [localFollowed, setLocalFollowed] = useState(undefined);
    const followed = localFollowed !== undefined ? localFollowed : affair?.followed ?? null;
    // the countries of who it names, even when its title names them (see countries.js)
    const countries = on('countries') ? countryNames(item.countries) : [];

    const tabs = [
        on('analysis') && paragraphs.length > 0 && (analysis || analysisPending) && {
            key: 'analysis', label: 'AI analysis', pending: analysisPending && !analysis,
            content: <CardAnalysis id={`analysis-${item.storyId}`} analysis={analysis} pending={analysisPending && !analysis} model={analysisModel}/>,
        },
        on('angles') && item.angles?.length > 0 && {key: 'angles', label: 'Angles', count: item.angles.length, content: <OtherAngles angles={item.angles} original={original}/>},
        on('affair') && affair && briefingId && {
            key: 'affair', label: 'This affair',
            content: <AffairPanel briefingId={briefingId} storyId={item.storyId} chip={affair} followed={followed}/>,
        },
        on('coverage') && item.articles?.length > 0 && {key: 'coverage', label: 'Coverage', count: item.corroboration?.media || undefined, content: <CardCoverage item={item}/>},
    ].filter(Boolean);
    // the affair is not the one open at first: it is built by the AI when its tab is opened, not for every card shown
    const more = chosen !== undefined ? chosen : tabs.find(tab => tab.key !== 'affair')?.key ?? null;

    // what the card is about and when, in the column beside it, or one line over its title on a phone
    const metas = [
        item.topic && <p key="topic" className="kicker !text-ink">{capitalized(item.topic)}</p>,
        countries.length > 0 && <p key="countries" className="caption font-medium !text-ink">{countries.join(' · ')}</p>,
        item.publishedAt && <p key="at" className="caption"><time dateTime={item.publishedAt}>{when(item.publishedAt)}</time></p>,
        item.language && <p key="language" className="leading-none md:leading-normal"><LanguageMark code={item.language} className="ml-0"/></p>,
    ].filter(Boolean);

    return (
        <article className="grid-12 border-t border-rule pt-10 pb-20">
            {/* on a phone one line over the title, its number first ("01 · sport · Italy · 30 Oct"), a little larger than the rest of the line (the
                user, 05.11.2026): beside a big number, the column stacked into a block of its own (the user, 01.11.2026); beside the card from md */}
            <div className="col-span-12 flex flex-wrap items-center gap-x-2 gap-y-1 md:col-span-2 md:block">
                {number !== undefined && (
                    <p aria-hidden className={cn('tabular text-[1.25rem] leading-none font-semibold text-ink-mute md:text-[3rem] md:leading-none md:tracking-[-0.04em] md:text-ink-mute/45',
                        metas.length > 0 && DOT)}>
                        {String(number).padStart(2, '0')}
                    </p>
                )}
                <div className="contents md:mt-4 md:block">
                    {metas.map((meta, i) => (
                        // a dot after each but the last on a phone, at the end of a line where it wraps; none in the column
                        <div key={meta.key} className={cn('flex items-center md:mt-1 md:block md:first:mt-0', i < metas.length - 1 && DOT)}>
                            {meta}
                        </div>
                    ))}
                    {marked && item.found?.length > 0 && (
                        <div className="basis-full md:mt-3">
                            <p className="section-title !text-[1rem] !text-accent-ink">Found</p>
                            <p className="caption mt-0.5 !text-ink">
                                {item.found.map(({term, angle}) => angle ? `${term} (other angle)` : term).join(' · ')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="col-span-12 mt-4 md:col-span-7 md:mt-0">
                <h2 className="story-head text-balance">
                    {item.titleTranslation
                        ? <Marked text={item.titleTranslation} marks={marks.titleTranslation}/>
                        : <Marked text={item.title} marks={marks.title}/>}
                </h2>
                {/* written in another language: translated, the original shown on demand */}
                {translated && (
                    <p className="caption mt-2 flex flex-wrap items-baseline gap-x-3">
                        <span className="kicker">Translated from {languageLabel(item.language)}{item.titleAsPublished && !item.titleRewritten && ', title shortened'}</span>
                        <button type="button" onClick={() => setOriginal(!original)} aria-expanded={original} aria-controls={`original-${item.storyId}`}
                                className="cursor-pointer text-action-text hover:underline underline-offset-4">
                            {original ? 'Hide original' : 'Show original'}
                        </button>
                    </p>
                )}
                {translated && original && item.titleTranslation && (
                    <p lang={item.language ?? undefined} className="caption mt-1 italic">
                        {/* the original of the translation: the title of the card in its language; the title as published, when the AI
                            rewrote it, has its own button below, so the two originals are not mistaken for each other */}
                        “{item.titleRewritten ? <Marked text={item.title} marks={marks.title}/> : item.titleAsPublished ?? <Marked text={item.title} marks={marks.title}/>}”
                    </p>
                )}
                {/* the AI rewrote the title, a judgment of its medium inside its sentences, and a second opinion found it says the same
                    fact: the title as published on demand, in the language it was written in */}
                {item.titleRewritten && item.titleAsPublished && (
                    <p className="caption mt-2 flex flex-wrap items-baseline gap-x-3">
                        <span className="kicker">Title rewritten by the AI <InfoTip label="Title rewritten by the AI">{REWRITTEN_NOTE}</InfoTip></span>
                        <button type="button" onClick={() => setAsPublished(!asPublished)} aria-expanded={asPublished} aria-controls={`published-${item.storyId}`}
                                className="cursor-pointer text-action-text hover:underline underline-offset-4">
                            {asPublished ? 'Hide the title as published' : 'Show the title as published'}
                        </button>
                    </p>
                )}
                {item.titleRewritten && item.titleAsPublished && asPublished && (
                    <p id={`published-${item.storyId}`} lang={item.language ?? undefined} className="caption mt-1 italic">“{item.titleAsPublished}”</p>
                )}
                {/* not translated: the title was shortened, the bait of its medium taken out, as published on demand */}
                {item.titleAsPublished && !item.titleRewritten && !item.titleTranslation && (
                    <p className="caption mt-2 flex flex-wrap items-baseline gap-x-3">
                        <span className="kicker">Title shortened</span>
                        <button type="button" onClick={() => setAsPublished(!asPublished)} aria-expanded={asPublished} aria-controls={`published-${item.storyId}`}
                                className="cursor-pointer text-action-text hover:underline underline-offset-4">
                            {asPublished ? 'Hide the title as published' : 'Show the title as published'}
                        </button>
                    </p>
                )}
                {item.titleAsPublished && !item.titleRewritten && !item.titleTranslation && asPublished && (
                    <p id={`published-${item.storyId}`} lang={item.language ?? undefined} className="caption mt-1 italic">“{item.titleAsPublished}”</p>
                )}
                <Glance item={item} onOpen={openMore} onNote={showNote} on={on}/>
                {item.why && <p className="standfirst mt-3">{item.why}</p>}
                {on('picture') && item.thumbnail && <Picture key={item.thumbnail} src={item.thumbnail} source={item.thumbnailSource}
                                            illustration={item.thumbnail === item.illustration?.url}/>}

                {paragraphs.length === 0 ? (
                    <div className="mt-6">
                        <Notice>{item.summaryError ?? 'No article of this story could be read (paywall or protected site).'}</Notice>
                    </div>
                ) : translation.length > 0 ? (
                    <div className="mt-6">
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                            <p className="section-title">In the article's words, translated</p>
                            {aiSwitch}
                        </div>
                        <div className="body-text mt-3"><Way paragraphs={translation} lede={lede}/></div>
                        <p className="footnote mt-3">
                            Sentences chosen by the AI in the article {lead && <>of {lead.source} </>}and translated by it: it may contain errors, the original is the reference.
                            {item[fields.translation]?.includes(`${ORIGINAL_START}(`) && ' The sentences in italics, between parentheses, are left in the language of the article: the AI could not translate them.'}
                            {item[fields.translation]?.includes(UNCHECKED) && ` The sentences in italics marked ${UNCHECKED} are translated by the AI, but a figure of the original could not be found in them: check it in the original.`}
                        </p>
                        {original && (
                            <div id={`original-${item.storyId}`} className="mt-6 border-l border-rule pl-5">
                                <p className="section-title !text-[1rem]">Original, {languageLabel(item.language)}</p>
                                <div lang={item.language ?? undefined} className="body-text mt-3 text-ink/85"><Way paragraphs={paragraphs}/></div>
                                <p className="footnote mt-3">As the article published them.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mt-6">
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                            <p className="section-title">In the article's words</p>
                            {aiSwitch}
                        </div>
                        <div className="body-text mt-3"><Way paragraphs={paragraphs} lede={lede}/></div>
                        <p className="footnote mt-3">
                            Sentences chosen by the AI, shown as the article {lead && <>of {lead.source} </>}published them.
                        </p>
                    </div>
                )}

                {/* the AI version, when the switch over the sentences is on: under them, for the reader to compare the two */}
                {paragraphs.length > 0 && aiText && showAi && <AiVersion id={`ai-${item.storyId}`} format={format} text={aiText} model={item.ai.model} source={lead?.source}/>}

                {/* the way to the article, right under its sentences (the user, 06.11.2026); who else covers it is at the very bottom */}
                {lead && <NewsLinks lead={lead} show="article" className="mt-5"/>}

                {/* what lies around the news, behind one strip: the first open at first */}
                <CardMore tabs={tabs} open={more} onOpen={setChosen} id={`card-${item.storyId}`}/>

                {/* at the very bottom, a few of the media that cover it: the others open the coverage */}
                {lead && <NewsLinks lead={lead} others={item.articles.filter(article => article.url !== lead.url)} show="others" className="mt-10" limit={3}
                                    onMore={on('coverage') ? () => openMore('coverage') : null}/>}
            </div>

            <aside className="col-span-12 mt-10 space-y-5 md:col-span-3 md:col-start-10 md:mt-1">
                {item.imported && (
                    <Margin kicker="Added by you">
                        {item.transferred
                            ? 'Copied from another of your briefings, with its other angles, sources and analysis.'
                            // read and completed like the cards (the media that tell it, other angles, official sources, the people named, analysis)
                            // when it has the count of the media that tell it; a news added before 03.11.2026, or whose steps failed, has only its page
                            : item.corroboration ? 'Chosen by you, then read and completed like the other cards: other media, angles, official sources, people named, analysis.'
                                : 'From its link: not chosen nor checked against other media.'}
                        {onRemove && (
                            <button type="button" onClick={onRemove}
                                    className="mt-1 block cursor-pointer text-action-text hover:underline underline-offset-4">Take it out</button>
                        )}
                    </Margin>
                )}
                {item.project && <Margin kicker="For your project">{item.project}</Margin>}
                {item.followUp && <FollowUp followUp={item.followUp}/>}
                {on('contested') && item.contested?.length > 0 && <Contested id={`card-${item.storyId}-contested`} denials={item.contested} original={original}/>}
                {on('official') && item.official?.length > 0 && <OfficialSource id={`card-${item.storyId}-official`} posts={item.official} original={original}/>}
                {on('unconfirmed') && item.hedged && (
                    <Margin id={`card-${item.storyId}-unconfirmed`} kicker="Not confirmed" tone="accent">
                        unconfirmed: “{item.hedgedTranslation ?? item.hedged}”
                        <InfoTip label="unconfirmed">The article says itself, in these words, that this is not confirmed yet.</InfoTip>
                    </Margin>
                )}
                {on('affair') && affair && briefingId && (
                    <AffairRail briefingId={briefingId} storyId={item.storyId} chip={affair} followed={followed} onFollowed={setLocalFollowed}/>
                )}
                {on('names') && item.names?.length > 0 && (
                    <Margin kicker="Who it is about">
                        <ul aria-label="Who it is about" className="flex list-none flex-wrap gap-1.5 p-0">
                            {item.names.map(name => (
                                <li key={`${name.qid ?? ''} ${name.name}`}>
                                    <Link to={pageOf(name)}
                                          className="inline-flex items-center rounded-full border border-rule bg-paper px-2.5 py-0.5 text-[0.8125rem] text-action-text no-underline transition-colors hover:border-action hover:bg-paper-deep">
                                        {name.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Margin>
                )}
                {onSelect && (
                    <div>
                        <p className="section-title !text-[1rem]">E-mail</p>
                        <Checkbox checked={selected} onChange={event => onSelect(event.target.checked)} className="mt-0.5 text-[0.8125rem]">
                            Add to the e-mail
                        </Checkbox>
                    </div>
                )}
                {onVote && (
                    <div>
                        <p className="section-title !text-[1rem]">For you?</p>
                        <div className="mt-1 flex items-center gap-1">
                            <IconButton label="Good for me" title="Good for me: more stories like this one"
                                        pressed={item.vote === 'up'} onClick={() => onVote(item.vote === 'up' ? null : 'up')}>
                                {item.vote === 'up' ? <FaThumbsUp/> : <FaRegThumbsUp/>}
                            </IconButton>
                            <IconButton label="Not for me" title="Not for me: fewer stories like this one"
                                        pressed={item.vote === 'down'} onClick={() => onVote(item.vote === 'down' ? null : 'down')}>
                                {item.vote === 'down' ? <FaThumbsDown/> : <FaRegThumbsDown/>}
                            </IconButton>
                        </div>
                    </div>
                )}
            </aside>
        </article>
    );
};
