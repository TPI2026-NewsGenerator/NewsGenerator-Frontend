//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: BriefingCard.jsx
//  Description: One story of the briefing: why it was chosen, its summary, who tells it and how
//               many of them wrote it themselves, who denies it, its other angles, and the post where
//               a party of the news said it itself
//

import {Fragment, useState} from "react";
import {Link} from "react-router-dom";
import {FaRegThumbsDown, FaRegThumbsUp, FaThumbsDown, FaThumbsUp} from "react-icons/fa";
import {IconButton} from "@/components/ui/button.jsx";
import {Notice} from "@/components/ui/text.jsx";
import {coverageLabel} from "@/features/briefing/corroboration.js";
import {NewsLinks} from "@/components/news/NewsLinks.jsx";
import {LanguageMark} from "@/components/news/LanguageMark.jsx";
import {Marked} from "@/components/news/Marked.jsx";
import {ORIGINAL_START, paragraphsWithMarks} from "@/features/briefing/marks.js";
import {InfoTip} from "@/components/ui/info-tip.jsx";
import {Checkbox} from "@/components/ui/field.jsx";
import {languageLabel} from "@/features/briefing/profileWords.js";
import {fieldsOf} from "@/features/briefing/formats.js";
import {countryNames} from "@/features/briefing/countries.js";
import {CardAnalysis} from "@/features/briefing/components/BriefingAnalysis.jsx";
import {cn} from "@/lib/utils.js";
import {pageOf} from "@/features/entities/entityApi.js";

// Who the article credits for what it reports, read by the AI while it summarizes. It describes the
// article, never whether the news is true: said under each one, in the "i" next to it
const SOURCING = {
    named: {label: 'named sources', means: 'The article names who it quotes: a person, a club, an institution, an official statement.'},
    anonymous: {label: 'unnamed sources', means: 'The article relies on sources it does not name, such as “sources close to the club”.'},
    none: {label: 'no source given', means: 'The article credits nobody for what it reports: often a match report or a guide, with nobody to quote.'},
};
const SOURCING_NOTE = 'Read by the AI in the article quoted. It says nothing on whether the news is true.';

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
        <p className="kicker !text-accent-ink">Written by the AI</p>
        <div className="body-text mt-3">
            {format === 'points'
                ? <Points paragraphs={text.map(point => ({text: point}))}/>
                : <p>{text}</p>}
        </div>
        <p className="caption mt-3">
            Written by the AI ({model.replace(/:.*$/, '')}) from the article {source && <>of {source} </>}in its own words: it can get a
            fact wrong. The article's sentences above are the reference.
        </p>
    </div>
);

const when = (at) => new Date(at).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});

// Someone named who denies the news, in the words of one of its articles, a machine translation under
// it when written in another language than the reader's (see server/services/utils/contested.js).
// Nobody is said to be right: the reader is told who denies, and where it is written
const CONTESTED_NOTE = 'One of its articles reports that someone named denies this news. The sentence is the article’s own, found by the AI; it does not say who is right.';
const Contested = ({denials}) => (
    <div className="mt-6 rounded-2xl bg-paper-deep px-5 py-4">
        <p className="kicker !text-accent-ink">
            Contested
            <InfoTip label="Contested">{CONTESTED_NOTE}</InfoTip>
        </p>
        <ul className="mt-3 space-y-4">
            {denials.map(denial => (
                <li key={denial.url + denial.sentence}>
                    <p className="body-text"><span className="font-semibold">{denial.by} denies:</span>{' '}
                        <span lang={denial.language ?? undefined}>“<Marked text={denial.sentence} marks={denial.marks?.sentence}/>”</span>
                    </p>
                    {denial.translation && (
                        <p className="caption mt-1 italic">Machine translation: “<Marked text={denial.translation} marks={denial.marks?.translation}/>”</p>
                    )}
                    <p className="caption mt-1">
                        — <a href={denial.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">{denial.source}</a>
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
    <div className="mt-10">
        <p className="kicker">
            Same affair, other angles
            <InfoTip label="Same affair, other angles">{ANGLES_NOTE}</InfoTip>
        </p>
        <ul className="mt-3 space-y-3">
            {angles.map(angle => (
                <li key={angle.url}>
                    <a href={angle.url} target="_blank" rel="noreferrer" title={angle.titleTranslation ? angle.title : undefined}
                       className="body-text font-semibold underline-offset-2 hover:underline">
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
// Its title is the party's own, in the party's language. Or its statement one of the card's articles
// reports (channel 'reported', see statements.js): the sentence quoted, its translation under it
const OFFICIAL_NOTE = 'A party this news is about said it itself: published on its own website or account, as Wikidata lists them, or in a statement one of the articles reports, quoted as written. Found and read by the AI, which may be wrong: the link is the reference. X and Instagram can’t be read, so most news have none.';
const OfficialSource = ({posts}) => (
    <Margin kicker={<>Official sources <InfoTip label="Official sources">{OFFICIAL_NOTE}</InfoTip></>}>
        <ul className="space-y-2">
            {posts.map(post => post.channel === 'reported' ? (
                <li key={post.url + post.party}>
                    <span className="font-semibold">{post.party}</span> said it, reported by{' '}
                    <a href={post.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink-mute">{post.source}</a>:{' '}
                    <span lang={post.language ?? undefined}>“{post.title}”</span>
                    {post.translation && <span className="mt-1 block italic text-ink-mute">Machine translation: “{post.translation}”</span>}
                </li>
            ) : (
                <li key={post.url}>
                    <span className="font-semibold">{post.party}</span> said it:{' '}
                    <a href={post.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink-mute">{post.title}</a>
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

// A card sent by e-mail in the last two days it follows (see server/services/utils/repeats.js): the same
// story with news since, read from them, or a new step of its affair. followUp: {title, shownAt, evolved}
const FOLLOW_UP_NOTE = 'A story you sent by e-mail in the last two days counts as read: it is not shown again, unless news published since tell something new. Judged by the AI from their titles.';
const day = (at) => new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'});
const FollowUp = ({followUp}) => (
    <Margin kicker={<>Follow-up <InfoTip label="Follow-up">{FOLLOW_UP_NOTE}</InfoTip></>}>
        {followUp.evolved ? 'New since you read it' : 'A new step of the affair you read'}, sent on {day(followUp.shownAt)}:{' '}
        <span className="italic">“{followUp.title}”</span>
    </Margin>
);

// a note of the outer column: its kicker and what it says
const Margin = ({kicker, tone, children}) => (
    <div>
        <p className={cn('kicker', tone === 'accent' && '!text-accent-ink')}>{kicker}</p>
        <div className="caption mt-1 max-w-[32ch] !text-ink">{children}</div>
    </div>
);

// onVote(vote): 'up', 'down', or null when the reader takes back the thumb given. The next briefings
// learn from it; without onVote no thumb is shown. number: its place in the briefing. lede: the first
// story of the page, whose passages open with the drop cap. item.summary: the key sentences of the
// article as published, a paragraph per passage; item.translation: their machine translation.
// item.titleTranslation: the title in the language of the reader, when written in another (item.language).
// item.lead: the article of the title and the passages, absent from the briefings made before it was
// sent: their first article then. item.contested: who denies the news, quoted, absent from the older ones.
// item.angles: news of the same affair telling something else, absent from the older ones.
// item.official: [{party, title, url, channel, publishedAt}] the posts where a party said it itself, then
// its statements an article reports (channel 'reported', with source, translation, language), absent from the older ones.
// item.names: [{name, qid, kind}] the people and organisations most of its articles name, each opening its page (the one
// of its item of Wikidata, else the one of the name as written), absent from the briefings before 13.10.2026.
// item.countries: the codes ISO 3166-1 of the countries of who and where it names, the main first, shown
// under its topic unless its title names them, absent from the briefings before 18.10.2026.
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
// item.followUp: the card of the last days it follows (see FollowUp); item.imported: a news the reader
// added by its link, for the e-mail; item.transferred: that card copied from another briefing of the reader
const unmarked = (entry) => ({...entry, marks: undefined});
// onRemove: a news the reader added taken out of the briefing
export const BriefingCard = ({item: given, onVote, onSelect, onRemove, selected = false, number, lede = false, marked = false, format = 'passages',
                                 analysis, analysisPending = false, analysisModel}) => {
    const item = marked ? given : {...unmarked(given), angles: given.angles?.map(unmarked), contested: given.contested?.map(unmarked)};
    const coverage = coverageLabel(item.corroboration);
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
    // the AI version of the points or the summary, absent from the key passages and the briefings before 15.10.2026
    const aiText = format === 'points' ? item.ai?.points : format === 'digest' ? item.ai?.summary : null;
    const [showAi, setShowAi] = useState(false);
    // the countries of who it names, none when its title names them (see countries.js)
    const countries = countryNames(item.countries, {titles: [item.title, item.titleTranslation], languages: [item.language]});

    return (
        <article className="grid-12 border-t border-rule pt-10 pb-20">
            <div className="col-span-12 flex items-baseline gap-4 md:col-span-2 md:block">
                {number !== undefined && (
                    <p aria-hidden className="tabular text-[2.25rem] leading-none font-semibold tracking-[-0.04em] text-ink-mute/45 md:text-[3rem]">
                        {String(number).padStart(2, '0')}
                    </p>
                )}
                <div className="md:mt-4">
                    {item.topic && <p className="kicker !text-ink">{item.topic}</p>}
                    {countries.length > 0 && <p className="caption mt-1 font-medium !text-ink">{countries.join(' · ')}</p>}
                    {item.publishedAt && <p className="folio mt-1"><time dateTime={item.publishedAt}>{when(item.publishedAt)}</time></p>}
                    {item.language && <p className="mt-1"><LanguageMark code={item.language} className="ml-0"/></p>}
                    {marked && item.found?.length > 0 && (
                        <div className="mt-3">
                            <p className="kicker !text-accent-ink">Found</p>
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
                        <span className="kicker">Translated from {languageLabel(item.language)}</span>
                        <button type="button" onClick={() => setOriginal(!original)} aria-expanded={original} aria-controls={`original-${item.storyId}`}
                                className="cursor-pointer text-action-text hover:underline underline-offset-4">
                            {original ? 'Hide original' : 'Show original'}
                        </button>
                    </p>
                )}
                {translated && original && item.titleTranslation && (
                    <p lang={item.language ?? undefined} className="caption mt-1 italic">“<Marked text={item.title} marks={marks.title}/>”</p>
                )}
                {item.why && <p className="standfirst mt-3">{item.why}</p>}
                {item.thumbnail && <Picture key={item.thumbnail} src={item.thumbnail} source={item.thumbnailSource}
                                            illustration={item.thumbnail === item.illustration?.url}/>}

                {paragraphs.length === 0 ? (
                    <div className="mt-6">
                        <Notice>{item.summaryError ?? 'No article of this story could be read (paywall or protected site).'}</Notice>
                    </div>
                ) : translation.length > 0 ? (
                    <div className="mt-6">
                        <p className="kicker">In the article's words, translated</p>
                        <div className="body-text mt-3"><Way paragraphs={translation} lede={lede}/></div>
                        <p className="caption mt-3">
                            Sentences chosen by the AI in the article {lead && <>of {lead.source} </>}and translated by it: it may contain errors, the original is the reference.
                            {item[fields.translation]?.includes(ORIGINAL_START) && ' The sentences in italics, between parentheses, are left in the language of the article: the AI could not translate them with their figures.'}
                        </p>
                        {original && (
                            <div id={`original-${item.storyId}`} className="mt-6 border-l border-rule pl-5">
                                <p className="kicker">Original, {languageLabel(item.language)}</p>
                                <div lang={item.language ?? undefined} className="body-text mt-3 text-ink/85"><Way paragraphs={paragraphs}/></div>
                                <p className="caption mt-3">As the article published them.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mt-6">
                        <p className="kicker">In the article's words</p>
                        <div className="body-text mt-3"><Way paragraphs={paragraphs} lede={lede}/></div>
                        <p className="caption mt-3">
                            Sentences chosen by the AI, shown as the article {lead && <>of {lead.source} </>}published them.
                        </p>
                    </div>
                )}

                {paragraphs.length > 0 && aiText && (
                    <>
                        <button type="button" onClick={() => setShowAi(!showAi)} aria-expanded={showAi} aria-controls={`ai-${item.storyId}`}
                                className="mt-4 cursor-pointer text-[0.875rem] text-action-text hover:underline underline-offset-4">
                            {showAi ? 'Hide AI version' : 'Show AI version'}
                        </button>
                        {showAi && <AiVersion id={`ai-${item.storyId}`} format={format} text={aiText} model={item.ai.model} source={lead?.source}/>}
                    </>
                )}

                {paragraphs.length > 0 && (analysis || analysisPending) && (
                    <div><CardAnalysis id={`analysis-${item.storyId}`} analysis={analysis} pending={analysisPending && !analysis} model={analysisModel}/></div>
                )}

                {item.contested?.length > 0 && <Contested denials={item.contested}/>}
                {item.angles?.length > 0 && <OtherAngles angles={item.angles} original={original}/>}

                {lead && <NewsLinks lead={lead} others={item.articles.filter(article => article.url !== lead.url)} className="mt-8"/>}
            </div>

            <aside className="col-span-12 mt-10 space-y-5 md:col-span-3 md:col-start-10 md:mt-1">
                {item.imported && (
                    <Margin kicker="Added by you">
                        {item.transferred
                            ? 'Copied from another of your briefings, with its other angles, sources and analysis.'
                            : 'From its link: not chosen nor checked against other media.'}
                        {onRemove && (
                            <button type="button" onClick={onRemove}
                                    className="mt-1 block cursor-pointer text-action-text hover:underline underline-offset-4">Take it out</button>
                        )}
                    </Margin>
                )}
                {item.project && <Margin kicker="For your project">{item.project}</Margin>}
                {item.followUp && <FollowUp followUp={item.followUp}/>}
                {item.official?.length > 0 && <OfficialSource posts={item.official}/>}
                {item.names?.length > 0 && (
                    <Margin kicker="Who it is about">
                        <ul aria-label="Who it is about" className="flex list-none flex-wrap gap-x-3 gap-y-0.5 p-0">
                            {item.names.map(name => (
                                <li key={`${name.qid ?? ''} ${name.name}`}>
                                    <Link to={pageOf(name)} className="text-action-text hover:underline underline-offset-4">
                                        {name.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Margin>
                )}
                {coverage && (
                    <Margin kicker="Who tells it">
                        {coverage.text}
                        <InfoTip label={coverage.text}>
                            {coverage.title}.
                            {item.corroboration.mediaNames?.length > 1 && <> Media: {item.corroboration.mediaNames.join(', ')}.</>}
                        </InfoTip>
                    </Margin>
                )}
                {SOURCING[item.sourcing] && (
                    <Margin kicker="Its sources">
                        {SOURCING[item.sourcing].label}
                        <InfoTip label={SOURCING[item.sourcing].label}>
                            {SOURCING[item.sourcing].means} <span className="text-ink-mute">{SOURCING_NOTE}</span>
                        </InfoTip>
                    </Margin>
                )}
                {item.hedged && (
                    <Margin kicker="Not confirmed" tone="accent">
                        unconfirmed: “{item.hedged}”
                        <InfoTip label="unconfirmed">The article says itself, in these words, that this is not confirmed yet.</InfoTip>
                    </Margin>
                )}
                {onSelect && (
                    <div>
                        <p className="kicker">E-mail</p>
                        <Checkbox checked={selected} onChange={event => onSelect(event.target.checked)} className="mt-0.5 text-[0.9375rem]">
                            Add to the e-mail
                        </Checkbox>
                    </div>
                )}
                {onVote && (
                    <div>
                        <p className="kicker">For you?</p>
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
