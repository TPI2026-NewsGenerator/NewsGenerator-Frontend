//
//  Author: Fabian Rostello
//  Date: 03.04.2026
//  File: Search.jsx
//  Description: Search page for frontend
//

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {Popover} from "radix-ui";
import {Search as SearchIcon, X} from "lucide-react";
import {useAuth} from "@/features/auth/useAuth.js";
import {PageShell, Opening} from "@/components/layout/Page.jsx";
import {Button} from "@/components/ui/button.jsx";
import {CheckboxGroup, FieldError, Help, Input, Label, Select} from "@/components/ui/field.jsx";
import {Notice} from "@/components/ui/text.jsx";
import {Dialog} from "@/components/ui/overlay.jsx";
import {FeedList} from "@/features/search/components/feed-list/FeedList.jsx";
import {SummaryList} from "@/features/search/components/summary-list/SummaryList.jsx";
import {SourceSuggestions} from "@/features/search/components/source-suggestions/SourceSuggestions.jsx";
import {SearchApi} from "@/features/search/api/searchApi.js";
import {createTranslator, TranslationContext} from "@/features/search/translation.js";
import {forgetSearch, keepSearch, keptSearch} from "@/features/search/keptSearch.js";
import {FeedApi} from "@/features/search/api/feedApi.js";
import {CustomSearchApi} from "@/features/custom-search/api/customSearchApi.js";
import {ProfileApi} from "@/features/briefing/api/briefingApi.js";
import {toast} from "@/lib/toast.js";

const languageOptions = [
    {value: 'en', label: 'English'},
    {value: 'fr', label: 'French'},
    {value: 'es', label: 'Spanish'},
    {value: 'de', label: 'German'},
    {value: 'it', label: 'Italian'},
];

// hours: news not older than this, null: no limit or a range chosen by the user
const timeframeOptions = [
    {value: 'h', label: 'Last hour', hours: 1},
    {value: 'd', label: 'Last 24 hours', hours: 24},
    {value: 'w', label: 'Last 7 days', hours: 24 * 7},
    {value: 'm', label: 'Last 30 days', hours: 24 * 30},
    {value: 'a', label: 'All time', hours: null},
    {value: 'c', label: 'Custom range…', hours: null},
];

// timeframe of the form -> {start, end} sent to the API
const toTimeframe = (timeframe, range) => {
    if (timeframe === 'c') {
        const [start, end] = range ?? [];
        return {start: start?.toISOString(), end: end?.toISOString()};
    }

    const hours = timeframeOptions.find(option => option.value === timeframe)?.hours;
    return hours ? {start: new Date(Date.now() - hours * 3600 * 1000).toISOString()} : {};
};

// "2026-09-28T10:30" of a datetime-local field, in the time of the user
const localInput = (date) => date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';

// "today at 14:32" or "yesterday at 21:05", when the news of a search kept were found (a day at most)
const searchedWhen = (at) => {
    const date = new Date(at);
    const day = date.toDateString() === new Date().toDateString() ? 'today' : 'yesterday';
    return `${day} at ${date.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'})}`;
};

const EMPTY_FORM = {id: null, title: '', keyword: '', category: [], timeframe: 'd', language: 'en'};
const ANY_MODE = {mode: null, checked: true, web: false};

// examples of exact words, set beside the search field
const KEYWORD_EXAMPLES = [
    ['"red card"', 'this exact phrase'],
    ['"referee"', 'this word, in any news'],
    ['referee, VAR', 'one or the other'],
    ['"red" "card"', 'both in the same news, narrower'],
    ['referee -rugby', 'referee, but never rugby'],
    ['-"red card"', 'excludes an exact phrase too'],
];

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);

// the fields a search needs, with what to tell when one is missing
const check = (form) => ({
    keyword: form.keyword.trim() ? null : 'Write what you are looking for.',
    category: form.category.length > 0 ? null : 'Please select at least 1 category.',
    language: form.language ? null : 'A language required.',
});

export const SearchPage = () => {
    const navigate = useNavigate();
    const {user, logout} = useAuth();
    // the last search of the reader, kept a day in their browser: left and opened again, the page was empty
    const [kept] = useState(() => user ? keptSearch(user.id) : null);
    const [newsList, setNewsList] = useState(kept?.news ?? []);
    // key passages of the selected news
    const [summaries, setSummaries] = useState(kept?.summaries ?? []);
    const [showSummaries, setShowSummaries] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [customSearchItems, setCustomSearchItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    // form
    const [formError, setFormError] = useState({});
    const [formValue, setFormValue] = useState(kept?.form ?? EMPTY_FORM);
    // true once the reader chose a language or loaded a saved search: theirs is never replaced
    const languageChosen = useRef(Boolean(kept));
    const [customRange, setCustomRange] = useState(() => kept?.range?.map(date => date ? new Date(date) : null) ?? null);
    // the search that gave the results, used to look for the media missing from the sources
    const [lastSearch, setLastSearch] = useState(kept?.search ?? null);
    const [searchCount, setSearchCount] = useState(0);
    // set when a search asking for every word found almost nothing: how many a wider one would find
    const [wider, setWider] = useState(kept?.wider ?? null);
    // how the last search was made: a sentence by its meaning ('meaning'), or exact words ('words'),
    // and whether the AI could check the news found by meaning
    const [searchMode, setSearchMode] = useState(kept?.mode ?? ANY_MODE);
    // the form of the search that gave the results, and when: what is kept with them
    const [searched, setSearched] = useState(kept ? {form: kept.form, range: kept.range ?? null, at: kept.at} : null);
    // the results shown are the ones kept, not of a search just made: said, with a way to search again
    const [restored, setRestored] = useState(Boolean(kept?.news?.length));
    const [saveSearchModal, setSaveSearchModal] = useState(false);

    const setField = (name, value) => {
        setFormValue(current => ({...current, [name]: value}));
        if (formError[name]) setFormError({...formError, [name]: null});
    };

    // the search page stays open signed out: it says to sign in at the next search
    const removeAuthCredentials = () => logout(null);

    const handleSubmit = async (keyword = formValue.keyword) => {
        // check if registered
        if (!user) {
            toast.error('Please log in to fetch news');
            navigate("/login");
            return;
        }

        // check form
        const errors = check({...formValue, keyword});
        setFormError(errors);
        if (Object.values(errors).some(Boolean)) {
            toast.error('Missing fields');
            return;
        }

        setIsLoading(true);

        // Get all links from category
        const search = {
            category: formValue.category,
            keywords: [keyword],
            language: formValue.language || 'en',
            timeframe: toTimeframe(formValue.timeframe, customRange),
        };
        try {
            const allNews = await SearchApi.getNews(search);
            setLastSearch(search);
            setSearchCount(count => count + 1);
            setSearched({form: {...formValue, keyword}, range: customRange, at: Date.now()});
            setRestored(false);

            // print error message
            if (allNews?.error?.includes?.('Forbidden, invalid or expired')) {
                toast.error('Your session has expired, please log in');
                removeAuthCredentials();
            } else if (allNews?.error) {
                // the server words it for the reader (the search by meaning unavailable, a category unknown)
                toast.error(typeof allNews.error === 'string' ? allNews.error : 'An error has occurred.. Please try again.');
            }

            setNewsList(allNews.news);
            setWider(allNews.wider ?? null);
            setSearchMode({mode: allNews.mode ?? null, checked: allNews.checked ?? true, web: allNews.web === true});
        } catch {
            toast.error('An error has occurred.. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // "Show those 218": the words are put back in the field with commas, so the search that runs is
    // the one the user can read and change afterwards
    const handleWiden = (keywords) => {
        setField('keyword', keywords);
        handleSubmit(keywords);
    };

    // a search reads every language: the cards written in another than the one searched are translated
    // as the reader reaches them, each search its own translations (the ones of a search kept, kept too)
    const translator = useMemo(() => lastSearch
        ? createTranslator(lastSearch.language, (asked) => SearchApi.translateNews(asked, lastSearch.language)
            .then(data => data?.translations ?? []), lastSearch === kept?.search ? kept.translations ?? [] : [])
        : null, [lastSearch, kept]);

    // the search kept with its news, their key passages and their translations as they come; a search
    // that found nothing replaces the one kept, which would be shown again otherwise
    useEffect(() => {
        if (!user || !searched || !lastSearch) return undefined;
        if (!Array.isArray(newsList) || newsList.length === 0) {
            forgetSearch();
            return undefined;
        }
        const keep = () => keepSearch(user.id, {
            form: searched.form, range: searched.range, at: searched.at, news: newsList, search: lastSearch,
            wider, mode: searchMode, summaries, translations: translator?.known() ?? [],
        });
        keep();
        if (!translator) return undefined;
        let timer;
        const unsubscribe = translator.subscribe(() => {
            clearTimeout(timer);
            timer = setTimeout(keep, 1000);
        });
        return () => {
            clearTimeout(timer);
            unsubscribe();
        };
    }, [user, searched, lastSearch, newsList, wider, searchMode, summaries, translator]);

    // key passages of the cards chosen, each with all its articles: the server reads up to five of
    // them, counts who wrote it themselves and the AI picks the key sentences of one, translated when needed
    const handleGenerate = async (urls) => {
        // a card, or a fact of the affair of a card, chosen on its own
        const chosen = newsList.flatMap(news => [news, ...(news.facts ?? [])]);
        const stories = urls.map(url => chosen.find(news => news.url === url)).filter(Boolean)
            .map(news => ({urls: [news.url, ...(news.sources ?? []).map(other => other.url)]}));
        setIsGenerating(true);
        const data = await SearchApi.getNewsSummary(stories, lastSearch?.language ?? formValue.language).catch(() => null);
        setIsGenerating(false);

        if (data?.error?.includes?.('Forbidden, invalid or expired')) {
            toast.error('Your session has expired, please log in');
            removeAuthCredentials();
            return;
        } else if (!data || data.error) {
            toast.error('An error has occurred.. Please try again.');
            return;
        }

        const summaryCount = data.news.filter(news => news.summary).length;
        toast.success(`${summaryCount} / ${data.news.length} news read.`);
        setSummaries(data.news);
        setShowSummaries(true);
    };

    // the search starts in the language of the reader: English was offered to a reader of French only
    useEffect(() => {
        if (!user) return;
        ProfileApi.get()
            .then(answer => {
                const language = answer?.profile?.language;
                if (!language || languageChosen.current) return;
                setFormValue(current => current.language === language ? current : {...current, language, category: []});
            })
            .catch(() => {});
    }, [user]);

    // categories of feeds that can be searched, they belong to the language chosen. All of them are
    // ticked, unless some of this language already are (a saved search): with none, the search was
    // refused until the reader ticked one, every time and again after each change of language
    // An answer for a language no longer chosen is dropped: the ones of English, arrived after the
    // language of the reader was set, left its categories half ticked
    useEffect(() => {
        let wanted = true;
        const language = formValue.language || 'en';
        SearchApi.getCategories(language)
            .then(data => {
                if (!wanted) return;
                const categories = data.categories ?? [];
                setCategoryOptions(categories);
                setFormValue(current => {
                    // the language changed before this answer was applied
                    if ((current.language || 'en') !== language) return current;
                    const kept = current.category.filter(category => categories.includes(category));
                    return {...current, category: kept.length > 0 ? kept : categories};
                });
            })
            .catch(e => console.error("Failed to fetch categories", e));
        return () => {
            wanted = false;
        };
    }, [formValue.language]);

    const loadSavedSearches = useCallback(async () => {
        if (!user) return;
        try {
            const data = await CustomSearchApi.getUserCustomSearch();
            if (data?.error) {
                console.log("Error with Prisma database");
                return;
            }
            setCustomSearchItems(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Failed to fetch searches", e);
        }
    }, [user]);

    // the saved search the form was filled from, replaced when saved again unless asNew
    const loadedSearch = customSearchItems.find(item => item.id === formValue.id) ?? null;

    const handleSaveSearch = async ({asNew = false} = {}) => {
        const id = asNew ? null : loadedSearch?.id ?? null;
        if (!user?.id) {
            toast.error('You must be logged in...');
            return;
        }
        if (!formValue.title) {
            toast.error('You must enter a title...');
            return;
        }
        if (!formValue.language) {
            toast.error('You must select a language...');
            return;
        }
        if (!formValue.keyword) {
            toast.error('You must enter a keyword at least...');
            return;
        }
        if (formValue.category.length < 1) {
            toast.error('You must select at least 1 category...');
            return;
        }
        try {
            const saved = await CustomSearchApi.postUserCustomSearch({
                id: id,
                title: formValue.title,
                language: formValue.language,
                keyword: formValue.keyword,
                category: formValue.category,
            });
            // a title the reader already gave another search: the server says so, the form stays open
            if (saved?.status === 409) {
                toast.error(saved.error);
                return;
            }
            if (!saved || saved.error) throw new Error(saved?.error ?? 'nothing saved');
            setSaveSearchModal(false);
            // the form is now the one saved: saving it again replaces it
            setFormValue(current => ({...current, id: saved.id}));
            await loadSavedSearches();

            if (!id) {
                toast.success(`${formValue.title} created successfully !`);
            } else {
                toast.success(`${formValue.title} modified successfully !`);
            }
        } catch (e) {
            console.error("Failed to save the search", e);
            if (!id) {
                toast.error(`Error while creating ${formValue.title}...`);
            } else {
                toast.error(`Error while modifying ${formValue.title}...`);
            }
        }
    };

    // a saved search fills the form, the timeframe chosen stays
    const applySavedSearch = (item) => {
        languageChosen.current = true;
        setFormValue({
            title: item.title,
            id: item.id,
            keyword: item.keyword,
            category: item.category,
            timeframe: formValue.timeframe,
            language: item.language,
        });
        setFormError({});
    };

    const removeSavedSearch = async (item) => {
        try {
            const data = await CustomSearchApi.deleteUserCustomSearch({id: item.id});

            // an error answers a body too ({error}): the list is read again, as the server has it
            if (!data?.deleted) {
                toast.error(`Error deleting ${item.title}...`);
                await loadSavedSearches();
                return;
            }
            setCustomSearchItems(customSearchItems.filter(other => other !== item));
            toast.success(`${item.title} deleted successfully !`);
        } catch (e) {
            console.error("Failed to remove search", e);
        }
    };

    useEffect(() => {
        loadSavedSearches();
    }, [loadSavedSearches]);

    // the two ways to search, in a panel the link next to the help opens: in a column of their own, they
    // made the page two columns beside the form (the user, 01.11.2026)
    const howToSearch = (
        <Popover.Root>
            <Popover.Trigger className="cursor-pointer text-action-text hover:underline underline-offset-4">How to search ›</Popover.Trigger>
            <Popover.Portal>
                <Popover.Content align="start" sideOffset={8} collisionPadding={16}
                                 className="raised z-50 w-[min(26rem,calc(100vw-2rem))] rounded-2xl bg-paper p-5 shadow-[0_12px_40px_rgba(0,0,0,0.16)] ring-1 ring-rule/60 outline-none animate-in fade-in-0 zoom-in-[0.98]">
                    <p className="text-[0.9375rem] font-semibold">A sentence</p>
                    <p className="caption mt-1">
                        The AI reads the news closest in meaning to it and keeps the ones that answer it, whatever
                        their words, then the ones close to it. Several words, a name or a whole question all work.
                    </p>
                    <p className="mt-5 text-[0.9375rem] font-semibold">Exact words</p>
                    <p className="caption mt-1">
                        As soon as you write quotes, a comma or -word, the news are those holding these words,
                        in the title, the description or the categories, newest first, without the AI.
                    </p>
                    <table className="mt-3 w-full border-collapse text-[0.8125rem]">
                        <tbody>
                        {KEYWORD_EXAMPLES.map(([example, meaning]) => (
                            <tr key={example} className="border-t border-rule align-baseline">
                                <td className="py-1.5 pr-3 whitespace-nowrap"><code>{example}</code></td>
                                <td className="py-1.5 text-ink-mute">{meaning}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    <p className="caption mt-3">
                        A word without quotes also finds its variants: in <code>referee, VAR</code>, referee finds
                        "referees". Words of 3 letters or less must match a whole word, so <code>VAR</code> does not find "Alvarez".
                    </p>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );

    return (
        <PageShell user={user} onSignOut={removeAuthCredentials}>
            <Opening
                kicker="Search"
                title="Search the news"
                standfirst="Write what you are looking for in your own words: the AI finds the news that answer it. Choose up to ten and it shows their key passages, in the articles' own words."
            />

            {/* one column from the left edge: the field first, the searches saved under it, then the filters */}
            <section className="page mt-12 md:mt-16" aria-label="What to look for">
                <form className="max-w-[60rem] space-y-10" noValidate onSubmit={event => {
                    event.preventDefault();
                    handleSubmit();
                }}>
                    <div>
                        <Label htmlFor="keyword">What are you looking for?</Label>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="relative min-w-0 flex-1">
                                <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-[1.125rem] -translate-y-1/2 text-ink-mute"/>
                                <Input id="keyword" name="keyword" value={formValue.keyword}
                                       placeholder="e.g., the new rules on electric cars in Europe"
                                       className="h-12 rounded-full pl-11 text-[1.0625rem]"
                                       onChange={event => setField('keyword', event.target.value)} invalid={Boolean(formError.keyword)}
                                       aria-describedby="keyword-help"/>
                            </div>
                            <Button variant="primary" type="submit" name="fetchNews" loading={isLoading} className="h-12 px-7 text-[1rem]">Search</Button>
                        </div>
                        <Help id="keyword-help" className="max-w-none">
                            A sentence, in your own words. For exact words, write them "between quotes" or use the other signs. {howToSearch}
                        </Help>
                        <FieldError>{formError.keyword}</FieldError>

                        {/* the searches saved, one click to fill the form */}
                        {customSearchItems.length > 0 && (
                            <div className="mt-5 flex flex-wrap items-center gap-2">
                                <p className="kicker mr-1">Saved</p>
                                {customSearchItems.map(item => (
                                    <span key={item.id}
                                          className={`inline-flex h-8 items-center rounded-full pr-1 pl-3.5 text-[0.875rem] transition-colors duration-200 ${formValue.id === item.id ? 'bg-action/12 text-action-text' : 'bg-paper-deep text-ink'}`}>
                                        <button type="button" onClick={() => applySavedSearch(item)} className="cursor-pointer whitespace-nowrap">
                                            {item.title}
                                        </button>
                                        <button type="button" onClick={() => removeSavedSearch(item)} aria-label={`Delete ${item.title}`} title={`Delete ${item.title}`}
                                                className="ml-1 inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-ink-mute transition-colors hover:bg-rule/60 hover:text-ink">
                                            <X aria-hidden className="size-3.5"/>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-start gap-x-6 gap-y-8">
                        <div className="w-full sm:w-64">
                            <Label htmlFor="language">Display language</Label>
                            <Select id="language" options={languageOptions} value={formValue.language}
                                    onChange={event => {
                                        languageChosen.current = true;
                                        setFormValue({...formValue, language: event.target.value, category: []});
                                    }}
                                    invalid={Boolean(formError.language)} aria-describedby="language-help"/>
                            <Help id="language-help">Every language is searched, the news written in another are translated into this one</Help>
                            <FieldError>{formError.language}</FieldError>
                        </div>
                        <div className="w-full sm:w-64">
                            <Label htmlFor="timeframe">Timeframe</Label>
                            <Select id="timeframe" options={timeframeOptions} value={formValue.timeframe}
                                    onChange={event => setField('timeframe', event.target.value)}/>
                            {formValue.timeframe !== 'c' && <Help>News published in this period</Help>}
                        </div>
                        {formValue.timeframe === 'c' && (
                            <>
                                <div className="w-full sm:w-64">
                                    <Label htmlFor="range-start">From</Label>
                                    <Input id="range-start" type="datetime-local" value={localInput(customRange?.[0])}
                                           max={localInput(new Date())}
                                           onChange={event => setCustomRange([event.target.value ? new Date(event.target.value) : null, customRange?.[1] ?? null])}/>
                                </div>
                                <div className="w-full sm:w-64">
                                    <Label htmlFor="range-end">To</Label>
                                    <Input id="range-end" type="datetime-local" value={localInput(customRange?.[1])}
                                           max={localInput(new Date())}
                                           onChange={event => setCustomRange([customRange?.[0] ?? null, event.target.value ? new Date(event.target.value) : null])}/>
                                    <Help>News published between these two dates</Help>
                                </div>
                            </>
                        )}
                    </div>

                    <CheckboxGroup legend="Category" chips
                                   options={categoryOptions.map(category => ({value: category, label: capitalize(category)}))}
                                   value={formValue.category} onChange={category => setField('category', category)}
                                   invalid={Boolean(formError.category)} error={formError.category}/>

                    <div>
                        <Button name="save" onClick={() => setSaveSearchModal(true)}>Save search</Button>
                    </div>
                </form>
            </section>

            {/* a saved search loaded in the form is replaced by it, unless saved as a new one: said
                before, a title typed over it renamed the search the reader had */}
            <Dialog open={saveSearchModal} onOpenChange={setSaveSearchModal}
                    title={loadedSearch ? `Save “${loadedSearch.title}”` : 'Save your custom search'}
                    description={loadedSearch
                        ? `The form comes from your saved search “${loadedSearch.title}”: replace it with the keywords, language and categories of the form, or keep it and save a new one.`
                        : 'Keywords, language and categories are kept under this title.'}
                    footer={<>
                        <Button variant="subtle" onClick={() => setSaveSearchModal(false)}>Cancel</Button>
                        {loadedSearch && <Button onClick={() => handleSaveSearch({asNew: true})}>Save as a new search</Button>}
                        <Button variant="primary" onClick={() => handleSaveSearch()}>
                            {loadedSearch ? `Replace “${loadedSearch.title}”` : 'Save'}
                        </Button>
                    </>}>
                <Label htmlFor="search-title">Search title</Label>
                <Input id="search-title" value={formValue.title} onChange={event => setField('title', event.target.value)}
                       onKeyDown={event => event.key === 'Enter' && handleSaveSearch()}/>
            </Dialog>

            <SummaryList summaries={summaries} open={showSummaries} onOpenChange={setShowSummaries}/>
            {restored && searched && newsList?.length > 0 && (
                <div className="page mt-12">
                    <Notice onClose={() => setRestored(false)}>
                        Your search of {searchedWhen(searched.at)}, kept for a day: the news published since are not in it.{' '}
                        <Button variant="link" size="sm" loading={isLoading} onClick={() => handleSubmit()}>Search again</Button>
                    </Notice>
                </div>
            )}
            {lastSearch && (
                <SourceSuggestions key={searchCount} api={FeedApi} search={lastSearch} categories={categoryOptions}/>
            )}
            <TranslationContext.Provider value={translator}>
                <FeedList newsList={newsList} onGenerate={handleGenerate} isGenerating={isGenerating}
                          wider={wider} onWiden={handleWiden} mode={searchMode.mode} checked={searchMode.checked} web={searchMode.web}
                          resumeCount={summaries.length} onOpenResume={() => setShowSummaries(true)}/>
            </TranslationContext.Provider>
        </PageShell>
    );
};
