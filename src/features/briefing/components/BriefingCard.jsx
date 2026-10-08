//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: BriefingCard.jsx
//  Description: One story of the briefing: why it was chosen, its summary, who tells it and how
//               many of them wrote it themselves, who denies it, and its other angles
//

import {Fragment, useState} from "react";
import {FaRegThumbsDown, FaRegThumbsUp, FaThumbsDown, FaThumbsUp} from "react-icons/fa";
import {IconButton} from "@/components/ui/button.jsx";
import {Notice} from "@/components/ui/text.jsx";
import {coverageLabel} from "@/features/briefing/corroboration.js";
import {NewsLinks} from "@/components/news/NewsLinks.jsx";
import {LanguageMark} from "@/components/news/LanguageMark.jsx";
import {InfoTip} from "@/components/ui/info-tip.jsx";
import {languageLabel} from "@/features/briefing/profileWords.js";
import {cn} from "@/lib/utils.js";

// Who the article credits for what it reports, read by the AI while it summarizes. It describes the
// article, never whether the news is true: said under each one, in the "i" next to it
const SOURCING = {
    named: {label: 'named sources', means: 'The article names who it quotes: a person, a club, an institution, an official statement.'},
    anonymous: {label: 'unnamed sources', means: 'The article relies on sources it does not name, such as “sources close to the club”.'},
    none: {label: 'no source given', means: 'The article credits nobody for what it reports: often a match report or a guide, with nobody to quote.'},
};
const SOURCING_NOTE = 'Read by the AI in the article quoted. It says nothing on whether the news is true.';

const paragraphsOf = (text) => text ? text.split(/\n\s*\n/) : [];

// Passages of an article, a gap between two of them: the sentences are the article's own, the AI only
// chose them (see server/services/utils/extract.js)
const Passages = ({paragraphs, lede, className}) => paragraphs.map((paragraph, i) => (
    <Fragment key={i}>
        {i > 0 && <p aria-hidden className="text-ink-mute">[…]</p>}
        <p className={cn(lede && i === 0 && 'lede', className)}>{paragraph}</p>
    </Fragment>
));

const when = (at) => new Date(at).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});

// Someone named who denies the news, in the words of one of its articles, a machine translation under
// it when written in another language than the reader's (see server/services/utils/contested.js).
// Nobody is said to be right: the reader is told who denies, and where it is written
const CONTESTED_NOTE = 'One of its articles reports that someone named denies this news. The sentence is the article’s own, found by the AI; it does not say who is right.';
const Contested = ({denials}) => (
    <div className="mt-6 border-l-2 border-accent-ink pl-5">
        <p className="kicker !text-accent-ink">
            Contested
            <InfoTip label="Contested">{CONTESTED_NOTE}</InfoTip>
        </p>
        <ul className="mt-3 space-y-4">
            {denials.map(denial => (
                <li key={denial.url + denial.sentence}>
                    <p className="body-text"><span className="font-semibold">{denial.by} denies:</span>{' '}
                        <span lang={denial.language ?? undefined}>“{denial.sentence}”</span>
                    </p>
                    {denial.translation && (
                        <p className="caption mt-1 italic">Machine translation: “{denial.translation}”</p>
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
    <div className="mt-8 border-l-2 border-rule pl-5">
        <p className="kicker">
            Same affair, other angles
            <InfoTip label="Same affair, other angles">{ANGLES_NOTE}</InfoTip>
        </p>
        <ul className="mt-3 space-y-3">
            {angles.map(angle => (
                <li key={angle.url}>
                    <a href={angle.url} target="_blank" rel="noreferrer" title={angle.titleTranslation ? angle.title : undefined}
                       className="body-text font-semibold underline-offset-2 hover:underline">
                        {angle.titleTranslation ?? angle.title}
                    </a>
                    {original && angle.titleTranslation && (
                        <p lang={angle.language ?? undefined} className="caption mt-1 italic">“{angle.title}”</p>
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
// item.angles: news of the same affair telling something else, absent from the older ones
export const BriefingCard = ({item, onVote, number, lede = false}) => {
    const coverage = coverageLabel(item.corroboration);
    const lead = item.lead ?? item.articles[0];
    const paragraphs = paragraphsOf(item.summary);
    const translation = paragraphsOf(item.translation);
    // the translation is shown, the original only when the reader opens it
    const translated = Boolean(item.titleTranslation) || translation.length > 0;
    const [original, setOriginal] = useState(false);

    return (
        <article className="grid-12 border-t border-rule pt-7 pb-14">
            <div className="col-span-12 flex items-baseline gap-4 md:col-span-2 md:block">
                {number !== undefined && (
                    <p aria-hidden className="font-display text-[2.6rem] leading-none text-ink-mute md:text-[3.4rem]">
                        {String(number).padStart(2, '0')}
                    </p>
                )}
                <div className="md:mt-4">
                    {item.topic && <p className="kicker !text-ink">{item.topic}</p>}
                    {item.publishedAt && <p className="folio mt-1"><time dateTime={item.publishedAt}>{when(item.publishedAt)}</time></p>}
                    {item.language && <p className="mt-1"><LanguageMark code={item.language} className="ml-0"/></p>}
                </div>
            </div>

            <div className="col-span-12 mt-4 md:col-span-7 md:mt-0">
                <h2 className="story-head text-balance">{item.titleTranslation ?? item.title}</h2>
                {/* written in another language: translated, the original shown on demand */}
                {translated && (
                    <p className="caption mt-2 flex flex-wrap items-baseline gap-x-3">
                        <span className="kicker">Translated from {languageLabel(item.language)}</span>
                        <button type="button" onClick={() => setOriginal(!original)} aria-expanded={original} aria-controls={`original-${item.storyId}`}
                                className="cursor-pointer font-semibold tracking-[0.06em] text-ink-mute [font-variant-caps:all-small-caps] underline underline-offset-4 hover:text-ink">
                            {original ? 'Hide original' : 'Show original'}
                        </button>
                    </p>
                )}
                {translated && original && item.titleTranslation && (
                    <p lang={item.language ?? undefined} className="caption mt-1 italic">“{item.title}”</p>
                )}
                {item.why && <p className="standfirst mt-3 text-ink-mute italic">{item.why}</p>}

                {paragraphs.length === 0 ? (
                    <div className="mt-6">
                        <Notice>{item.summaryError ?? 'No article of this story could be read (paywall or protected site).'}</Notice>
                    </div>
                ) : translation.length > 0 ? (
                    <div className="mt-6">
                        <p className="kicker">In the article's words, translated</p>
                        <div className="body-text mt-3"><Passages paragraphs={translation} lede={lede}/></div>
                        <p className="caption mt-3">
                            Sentences chosen by the AI in the article {lead && <>of {lead.source} </>}and translated by it: it may contain errors, the original is the reference.
                        </p>
                        {original && (
                            <div id={`original-${item.storyId}`} className="mt-6 border-l border-rule pl-5">
                                <p className="kicker">Original, {languageLabel(item.language)}</p>
                                <div lang={item.language ?? undefined} className="body-text mt-3 text-ink/85"><Passages paragraphs={paragraphs}/></div>
                                <p className="caption mt-3">As the article published them.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mt-6">
                        <p className="kicker">In the article's words</p>
                        <div className="body-text mt-3"><Passages paragraphs={paragraphs} lede={lede}/></div>
                        <p className="caption mt-3">
                            Sentences chosen by the AI, shown as the article {lead && <>of {lead.source} </>}published them.
                        </p>
                    </div>
                )}

                {item.contested?.length > 0 && <Contested denials={item.contested}/>}
                {item.angles?.length > 0 && <OtherAngles angles={item.angles} original={original}/>}

                {lead && <NewsLinks lead={lead} others={item.articles.filter(article => article.url !== lead.url)} className="mt-8"/>}
            </div>

            <aside className="col-span-12 mt-8 space-y-5 border-t border-rule pt-5 md:col-span-3 md:col-start-10 md:mt-1 md:border-t-0 md:border-l md:pt-0 md:pl-5">
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
