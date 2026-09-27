//
//  Author: Fabian Rostello
//  Date: 03.04.2026
//  File: Search.jsx
//  Description: Search page for frontend
//

import {useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {jwtDecode} from "jwt-decode";
import {PageShell, Opening, Section} from "@/components/layout/Page.jsx";
import {Button} from "@/components/ui/button.jsx";
import {CheckboxGroup, FieldError, Help, Input, Label, Select} from "@/components/ui/field.jsx";
import {Dialog} from "@/components/ui/overlay.jsx";
import {FeedList} from "@/features/search/components/feed-list/FeedList.jsx";
import {SummaryList} from "@/features/search/components/summary-list/SummaryList.jsx";
import {UserFeeds} from "@/features/search/components/user-feeds/UserFeeds.jsx";
import {SourceSuggestions} from "@/features/search/components/source-suggestions/SourceSuggestions.jsx";
import {SearchApi} from "@/features/search/api/searchApi.js";
import {FeedApi} from "@/features/search/api/feedApi.js";
import {CustomSearchApi} from "@/features/custom-search/api/customSearchApi.js";
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

// examples set beside the Keywords field
const KEYWORD_EXAMPLES = [
    ['referee', 'one word, the widest search'],
    ['referee, VAR', 'one or the other, widest still'],
    ['red card', 'both words in the same news, much narrower'],
    ['"red card"', 'this exact phrase'],
    ['referee -rugby', 'referee, but never rugby'],
    ['-"red card"', 'excludes an exact phrase too'],
];

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);

// the fields a search needs, with what to tell when one is missing
const check = (form) => ({
    keyword: form.keyword.trim() ? null : 'At least 1 keyword required.',
    category: form.category.length > 0 ? null : 'Please select at least 1 category.',
    language: form.language ? null : 'A language required.',
});

export const SearchPage = () => {
    const navigate = useNavigate();
    const [newsList, setNewsList] = useState([]);
    // AI resumes of the selected news
    const [summaries, setSummaries] = useState([]);
    const summaryListRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [customSearchItems, setCustomSearchItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [token, setToken] = useState(localStorage.getItem("JWT"));
    const [user, setUser] = useState(() => {
        try {
            return token ? jwtDecode(token) : null;
        } catch {
            return null;
        }
    });
    // form
    const [formError, setFormError] = useState({});
    const [formValue, setFormValue] = useState({
        id: null,
        title: '',
        keyword: '',
        category: [],
        timeframe: 'd',
        language: 'en',
    });
    const [customRange, setCustomRange] = useState(null);
    const [showSources, setShowSources] = useState(false);
    // the search that gave the results, used to look for the media missing from the sources
    const [lastSearch, setLastSearch] = useState(null);
    const [searchCount, setSearchCount] = useState(0);
    // set when a search asking for every word found almost nothing: how many a wider one would find
    const [wider, setWider] = useState(null);
    const [sourcesVersion, setSourcesVersion] = useState(0);
    const [saveSearchModal, setSaveSearchModal] = useState(false);

    const setField = (name, value) => {
        setFormValue(current => ({...current, [name]: value}));
        if (formError[name]) setFormError({...formError, [name]: null});
    };

    const removeAuthCredentials = () => {
        localStorage.removeItem("JWT");
        setToken(null);
        setUser(null);
    };

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
            const allNews = await SearchApi.getNews(search, token);
            setLastSearch(search);
            setSearchCount(count => count + 1);

            // print error message
            if (allNews?.error?.includes?.('Forbidden, invalid or expired')) {
                toast.error('Token is invalid or has expired, please log in');
                removeAuthCredentials();
            } else if (allNews?.error) {
                toast.error('An error has occurred.. Please try again.');
            }

            setNewsList(allNews.news);
            setWider(allNews.wider ?? null);
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

    // AI resume of the selected news (the server scrapes them first)
    const handleGenerate = async (urls) => {
        setIsGenerating(true);
        const data = await SearchApi.getNewsSummary(urls, token).catch(() => null);
        setIsGenerating(false);

        if (data?.error?.includes?.('Forbidden, invalid or expired')) {
            toast.error('Token is invalid or has expired, please log in');
            removeAuthCredentials();
            return;
        } else if (!data || data.error) {
            toast.error('An error has occurred.. Please try again.');
            return;
        }

        const summaryCount = data.news.filter(news => news.summary).length;
        toast.success(`${summaryCount} / ${data.news.length} news summarized.`);
        setSummaries(data.news);
    };

    // categories of feeds that can be searched, they belong to the language chosen
    useEffect(() => {
        SearchApi.getCategories(formValue.language || 'en')
            .then(data => setCategoryOptions(data.categories ?? []))
            .catch(e => console.error("Failed to fetch categories", e));
    }, [formValue.language]);

    // show the resumes once generated
    useEffect(() => {
        if (summaries.length > 0) {
            summaryListRef.current?.scrollIntoView({behavior: 'smooth'});
        }
    }, [summaries]);

    const handleSaveSearch = async () => {
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
            await CustomSearchApi.postUserCustomSearch({
                id: formValue.id,
                title: formValue.title,
                language: formValue.language,
                keyword: formValue.keyword,
                category: formValue.category,
            }, token);
            setSaveSearchModal(false);

            if (!formValue.id) {
                toast.success(`${formValue.title} created successfully !`);
            } else {
                toast.success(`${formValue.title} modified successfully !`);
            }
        } catch (e) {
            console.error("Failed to fetch searches", e);
            if (!formValue.id) {
                toast.error(`Error while creating ${formValue.title}...`);
            } else {
                toast.error(`Error while modifying ${formValue.title}...`);
            }
        }
    };

    // a saved search fills the form, the timeframe chosen stays
    const applySavedSearch = (item) => {
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
            const data = await CustomSearchApi.deleteUserCustomSearch({id: item.id}, token);

            if (!data) {
                toast.error(`Error deleting ${item.title}...`);
                return;
            }
            setCustomSearchItems(customSearchItems.filter(other => other !== item));
            toast.success(`${item.title} deleted successfully !`);
        } catch (e) {
            console.error("Failed to remove search", e);
        }
    };

    useEffect(() => {
        const getUserCustomSearches = async () => {
            if (!user) return;
            try {
                const data = await CustomSearchApi.getUserCustomSearch(token);
                if (data?.error) {
                    console.log("Error with Prisma database");
                    return;
                }
                setCustomSearchItems(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error("Failed to fetch searches", e);
            }
        };

        getUserCustomSearches();
    }, [user, token]);

    return (
        <PageShell user={user} onSignOut={removeAuthCredentials}>
            <Opening
                kicker="Search"
                title="Search the news"
                standfirst="Any subject, in the sources of your language and the ones you added. Choose up to ten articles and the AI writes their resume."
                aside={
                    <div>
                        <p className="kicker">Saved searches</p>
                        {customSearchItems.length === 0
                            ? <p className="caption mt-2">None yet. Fill the form, then save the search to find it here.</p>
                            : (
                                <ul className="mt-2 border-t border-rule">
                                    {customSearchItems.map(item => (
                                        <li key={item.id} className="flex items-baseline justify-between gap-3 border-b border-rule py-2">
                                            <button type="button" onClick={() => applySavedSearch(item)}
                                                    className={`min-w-0 cursor-pointer text-left hover:text-accent-ink ${formValue.id === item.id ? 'text-accent-ink' : ''}`}>
                                                {item.title}
                                            </button>
                                            <button type="button" onClick={() => removeSavedSearch(item)} aria-label={`Delete ${item.title}`}
                                                    className="kicker cursor-pointer hover:!text-accent-ink">
                                                Delete
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                    </div>
                }
            />

            <Section kicker="The query" title="What to look for">
                <form className="grid-12 gap-y-12" noValidate onSubmit={event => {
                    event.preventDefault();
                    handleSubmit();
                }}>
                    <div className="col-span-12 space-y-10 md:col-span-8">
                        <div>
                            <Label htmlFor="keyword">Keywords</Label>
                            <Input id="keyword" name="keyword" value={formValue.keyword} placeholder='e.g., referee -rugby, "red card"'
                                   onChange={event => setField('keyword', event.target.value)} invalid={Boolean(formError.keyword)}
                                   aria-describedby="keyword-help"/>
                            <Help id="keyword-help">
                                Comma = or (widest), several words = all of them in the same news (narrow), "quotes" = exact phrase, -word = exclude
                            </Help>
                            <FieldError>{formError.keyword}</FieldError>
                        </div>


                        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="language">Language</Label>
                                <Select id="language" options={languageOptions} value={formValue.language}
                                        onChange={event => setFormValue({...formValue, language: event.target.value, category: []})}
                                        invalid={Boolean(formError.language)}/>
                                <FieldError>{formError.language}</FieldError>
                            </div>
                            <div>
                                <Label htmlFor="timeframe">Timeframe</Label>
                                <Select id="timeframe" options={timeframeOptions} value={formValue.timeframe}
                                        onChange={event => setField('timeframe', event.target.value)}/>
                                {formValue.timeframe !== 'c' && <Help>News published in this period</Help>}
                            </div>
                            {formValue.timeframe === 'c' && (
                                <>
                                    <div>
                                        <Label htmlFor="range-start">From</Label>
                                        <Input id="range-start" type="datetime-local" value={localInput(customRange?.[0])}
                                               max={localInput(new Date())}
                                               onChange={event => setCustomRange([event.target.value ? new Date(event.target.value) : null, customRange?.[1] ?? null])}/>
                                    </div>
                                    <div>
                                        <Label htmlFor="range-end">To</Label>
                                        <Input id="range-end" type="datetime-local" value={localInput(customRange?.[1])}
                                               max={localInput(new Date())}
                                               onChange={event => setCustomRange([customRange?.[0] ?? null, event.target.value ? new Date(event.target.value) : null])}/>
                                        <Help>News published between these two dates</Help>
                                    </div>
                                </>
                            )}
                        </div>

                        <CheckboxGroup legend="Category"
                                       options={categoryOptions.map(category => ({value: category, label: capitalize(category)}))}
                                       value={formValue.category} onChange={category => setField('category', category)}
                                       invalid={Boolean(formError.category)} error={formError.category}/>

                        <div>
                            <div className="flex items-baseline gap-4">
                                <p className="kicker !text-ink">My sources</p>
                                <Button variant="link" size="sm" aria-expanded={showSources} onClick={() => setShowSources(!showSources)}>
                                    {showSources ? 'hide' : 'show'}
                                </Button>
                            </div>
                            <Help>Websites you add are searched with the others, but only in your searches</Help>
                            {showSources && (
                                <div className="mt-6">
                                    <UserFeeds token={token} categories={categoryOptions} api={FeedApi}
                                               reloadKey={sourcesVersion} language={formValue.language || 'en'}/>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-3 border-t border-rule pt-6">
                            <Button variant="primary" type="submit" name="fetchNews" loading={isLoading}>Search</Button>
                            <Button name="save" onClick={() => setSaveSearchModal(true)}>Save search</Button>
                        </div>
                    </div>

                    <aside className="col-span-12 md:col-span-3 md:col-start-10 md:border-l md:border-rule md:pl-5">
                        <p className="kicker">How to write keywords</p>
                        <p className="caption mt-2">Searched in the title, the description and the categories of the news.</p>
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
                            A word also finds its variants: <code>referee</code> finds "referees". Words of 3 letters or less
                            must match a whole word, so <code>VAR</code> does not find "Alvarez".
                        </p>
                        <p className="caption mt-3">
                            Unlike a web search, several words <em>remove</em> the news that do not have them all:
                            {' '}<code>referee football soccer</code> asks for the three at once and finds almost nothing.
                            Start with one word, add commas to widen, add words to narrow.
                        </p>
                    </aside>
                </form>
            </Section>

            <Dialog open={saveSearchModal} onOpenChange={setSaveSearchModal} title="Save your custom search"
                    description="Keywords, language and categories are kept under this title."
                    footer={<>
                        <Button variant="subtle" onClick={() => setSaveSearchModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleSaveSearch}>Save</Button>
                    </>}>
                <Label htmlFor="search-title">Search title</Label>
                <Input id="search-title" value={formValue.title} onChange={event => setField('title', event.target.value)}
                       onKeyDown={event => event.key === 'Enter' && handleSaveSearch()}/>
            </Dialog>

            <SummaryList ref={summaryListRef} summaries={summaries}/>
            {lastSearch && (
                <SourceSuggestions key={searchCount} token={token} api={FeedApi} search={lastSearch} categories={categoryOptions}
                                   onImported={() => setSourcesVersion(sourcesVersion + 1)}/>
            )}
            <FeedList newsList={newsList} onGenerate={handleGenerate} isGenerating={isGenerating}
                      wider={wider} onWiden={handleWiden}/>
        </PageShell>
    );
};
