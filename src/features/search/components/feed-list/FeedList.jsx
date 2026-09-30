//
//  Author: Fabian Rostello
//  Date: 19.05.2026
//  File: FeedList.jsx
//  Description: FeedList component used in Search Page
//

import {useCallback, useEffect, useRef, useState} from "react";
import {Article} from "../article/Article.jsx";
import {Section} from "@/components/layout/Page.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Label, Select} from "@/components/ui/field.jsx";
import {toast} from "@/lib/toast.js";

const MAX_SELECTED = 10;

// Filters on what the grouping measured. None of them says a news is true: 'several' only means
// several media carry it, and a rumour carried by twenty media is still a rumour.
const COVERAGE = {
    several: item => item.corroboration?.media > 1,
    wordings: item => item.corroboration?.wordings > 1,
    alone: item => (item.corroboration?.media ?? 1) === 1,
};

const COVERAGE_OPTIONS = [
    {label: 'Carried by several media', value: 'several'},
    {label: 'Several media, each its own wording', value: 'wordings'},
    {label: 'This source only', value: 'alone'},
];

const TIME_OPTIONS = [
    {label: 'Newest first', value: 'desc'},
    {label: 'Oldest first', value: 'asc'},
];

// resumeCount / onOpenResume: the key passages shown last, opened again from here once closed
// mode: 'meaning' for a sentence (each news has match 'answer' or 'related', in the order of the AI),
// 'words' for exact words; checked: false when the AI could not sort the news found by meaning; web:
// true when our sources answered little and Google News was asked the sentence too
export const FeedList = ({newsList, onGenerate, isGenerating, wider, onWiden, resumeCount = 0, onOpenResume, mode = null, checked = true, web = false}) => {
    const selectedIds = useRef([]);
    const [selectedCount, setSelectedCount] = useState(0);
    const [filteredData, setFilteredData] = useState(newsList);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [sourceFilter, setSourceFilter] = useState('');
    const [timeFilter, setTimeFilter] = useState('');
    const [coverageFilter, setCoverageFilter] = useState('');
    const [wordingFilter, setWordingFilter] = useState('');

    // The list holds every card, 200 and more of them. The same function at every render keeps the
    // memoized rows from being drawn again at each selection, and the ref answers at once whether
    // one more can be chosen.
    const handleSelect = useCallback((id, checked) => {
        if (checked) {
            if (selectedIds.current.length >= MAX_SELECTED) {
                toast.error(`${MAX_SELECTED} articles max.`);
                return false;
            }
            selectedIds.current = [...selectedIds.current, id];
        } else {
            selectedIds.current = selectedIds.current.filter(other => other !== id);
        }
        setSelectedCount(selectedIds.current.length);
        return true;
    }, []);

    useEffect(() => {
        setFilteredData(newsList);
    }, [newsList]);

    if (!newsList) {
        return (
            <section className="page mt-20">
                <p className="section-head border-t border-ink pt-5">No news found…</p>
            </section>
        );
    }
    // no search yet
    if (newsList.length === 0 && !mode) return null;
    if (newsList.length === 0) {
        return (
            <section className="page mt-20">
                <p className="section-head border-t border-ink pt-5">
                    {mode === 'meaning' ? 'No news answers your search in this period.' : 'No news holds these words in this period.'}
                </p>
                <p className="mt-3 max-w-[60ch] text-ink-mute">
                    {mode === 'meaning'
                        ? 'Try other words, a longer period or more categories.'
                        : 'Try fewer words, a longer period or more categories.'}
                    {wider && <>
                        {' '}{wider.found} have at least one of {wider.terms.join(', ')}.{' '}
                        <Button variant="link" onClick={() => onWiden(wider.terms.join(', '))}>Show those {wider.found}</Button>
                    </>}
                </p>
            </section>
        );
    }

    const sources = [...new Set(newsList.map(item => item.source))].sort().map(source => ({label: source, value: source}));

    // the hedging words actually present in these results, so the user can ask for one of them
    // rather than for a category we would have invented
    const wordings = [
        {label: 'Any of these words', value: '*'},
        ...[...new Set(newsList.map(item => item.hedged).filter(Boolean))].sort().map(word => ({label: `"${word}"`, value: word})),
    ];

    const applyFilters = () => {
        let result = [...newsList];
        if (sourceFilter) result = result.filter(item => item.source === sourceFilter);
        if (coverageFilter) result = result.filter(COVERAGE[coverageFilter]);
        // the articles saying themselves they have no confirmation
        if (wordingFilter) result = result.filter(item => wordingFilter === '*' ? item.hedged : item.hedged === wordingFilter);
        // Aide Claude IA: how to sort iso time
        if (timeFilter) {
            result.sort((a, b) => {
                const dateA = new Date(a.publishedAt).getTime();
                const dateB = new Date(b.publishedAt).getTime();
                return timeFilter === 'asc' ? dateA - dateB : dateB - dateA;
            });
        }
        setFilteredData(result);
        setShowFilterPanel(false);
    };

    const clearFilters = () => {
        setSourceFilter('');
        setTimeFilter('');
        setCoverageFilter('');
        setWordingFilter('');
        setFilteredData(newsList);
    };

    const activeFilters = [sourceFilter, timeFilter, coverageFilter, wordingFilter].filter(Boolean).length;

    // a sentence: the answers, then the news only close to it, marked where they start while the
    // list keeps the order of the AI
    const byMeaning = mode === 'meaning' && checked;
    const answerCount = newsList.filter(item => item.match === 'answer').length;
    const firstRelated = byMeaning && !timeFilter ? filteredData.findIndex(item => item.match === 'related') : -1;

    return (
        <Section
            kicker="The results"
            title="Your news list"
            intro={<>
                <p>
                    {byMeaning
                        ? `${answerCount} ${answerCount === 1 ? 'news answers' : 'news answer'} your search, ${newsList.length - answerCount} ${newsList.length - answerCount === 1 ? 'is' : 'are'} close to it`
                        : `Found ${newsList.length} articles`}
                    {filteredData.length !== newsList.length && `, ${filteredData.length} kept by the filters`}.
                    {' '}Choose up to {MAX_SELECTED} and the AI shows their key passages.
                </p>
                {web && (
                    <p className="mt-2">Our sources had little on it, so Google News was asked your sentence too: its news are among these.</p>
                )}
                {mode === 'meaning' && !checked && (
                    <p className="mt-2">The AI could not read them this time: these are the news closest in meaning to your search, the closest first.</p>
                )}
                {wider && (
                    <p className="mt-2">
                        Every word is asked for at once, so only these have all of {wider.terms.join(', ')}.
                        {' '}{wider.found} have at least one.{' '}
                        <Button variant="link" onClick={() => onWiden(wider.terms.join(', '))}>
                            Show those {wider.found}
                        </Button>
                    </p>
                )}
            </>}
            aside={
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    {resumeCount > 0 && (
                        <Button size="sm" variant="primary" onClick={onOpenResume}>Read the key passages ({resumeCount})</Button>
                    )}
                    <Button size="sm" variant={activeFilters > 0 ? 'primary' : 'quiet'} aria-expanded={showFilterPanel}
                            onClick={() => setShowFilterPanel(!showFilterPanel)}>
                        {activeFilters > 0 ? `Filters applied (${activeFilters})` : 'Filter'}
                    </Button>
                    {activeFilters > 0 && (
                        <Button size="sm" variant="subtle" onClick={clearFilters}>Clear filters</Button>
                    )}
                </div>
            }
        >
            {showFilterPanel && (
                <div className="mb-10 border-y border-ink py-6">
                    <div className="grid-12 gap-y-6">
                        <div className="col-span-12 sm:col-span-6 md:col-span-3">
                            <Label htmlFor="filter-source">Source</Label>
                            <Select id="filter-source" options={sources} placeholder="Any source"
                                    value={sourceFilter} onChange={event => setSourceFilter(event.target.value)}/>
                        </div>
                        <div className="col-span-12 sm:col-span-6 md:col-span-3">
                            <Label htmlFor="filter-time">Time</Label>
                            <Select id="filter-time" options={TIME_OPTIONS} placeholder="As found"
                                    value={timeFilter} onChange={event => setTimeFilter(event.target.value)}/>
                        </div>
                        <div className="col-span-12 sm:col-span-6 md:col-span-3">
                            <Label htmlFor="filter-coverage">How widely it is carried</Label>
                            <Select id="filter-coverage" options={COVERAGE_OPTIONS} placeholder="Any"
                                    value={coverageFilter} onChange={event => setCoverageFilter(event.target.value)}/>
                        </div>
                        <div className="col-span-12 sm:col-span-6 md:col-span-3">
                            <Label htmlFor="filter-wording">The article says it has no confirmation</Label>
                            <Select id="filter-wording" options={wordings}
                                    placeholder={wordings.length > 1 ? 'Any word' : 'None in these results'}
                                    disabled={wordings.length <= 1}
                                    value={wordingFilter} onChange={event => setWordingFilter(event.target.value)}/>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                        <p className="caption max-w-[60ch] italic">
                            These describe what was counted, not whether a news is true: a rumour carried by twenty
                            media is still a rumour, and a paper writing "reportedly" is telling you it could not confirm.
                        </p>
                        <div className="flex gap-2">
                            <Button size="sm" variant="subtle" onClick={() => setShowFilterPanel(false)}>Cancel</Button>
                            <Button size="sm" variant="primary" onClick={applyFilters}>Apply filters</Button>
                        </div>
                    </div>
                </div>
            )}

            <ul className="list-none divide-y divide-rule border-y border-rule p-0">
                {filteredData.map((news, i) => (
                    <li key={news.url} className="lazy-row">
                        {i === firstRelated && (
                            <p className={`kicker pb-3 ${i > 0 ? 'border-t border-ink pt-8' : 'pt-3'}`}>Close to your search</p>
                        )}
                        <Article id={news.url} onSelect={handleSelect} news={news}/>
                    </li>
                ))}
            </ul>

            {selectedCount > 0 && (
                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink bg-paper">
                    <div className="page flex items-center justify-between gap-4 py-3">
                        <p className="folio !text-ink">
                            {selectedCount} of {MAX_SELECTED} articles chosen
                        </p>
                        <Button variant="primary" loading={isGenerating} onClick={() => onGenerate(selectedIds.current)}>
                            Show the key passages
                        </Button>
                    </div>
                </div>
            )}
        </Section>
    );
};
