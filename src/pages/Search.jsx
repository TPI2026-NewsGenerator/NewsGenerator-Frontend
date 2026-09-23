//
//  Author: Fabian Rostello
//  Date: 03.04.2026
//  File: Search.jsx
//  Description: Search page for frontend
//

import {forwardRef, useEffect, useRef, useState} from "react";
import {
    Button,
    Container,
    Content,
    CustomProvider,
    VStack,
    Form, Checkbox, CheckboxGroup, toaster, Message, ButtonToolbar, SelectPicker, Card, Loader,
    Tag, Text, HStack, TagGroup, Modal, DateRangePicker, Whisper, Popover
} from "rsuite";
import {FaInfoCircle} from "react-icons/fa";
import {useNavigate} from "react-router-dom";
import {jwtDecode} from "jwt-decode";
import {SchemaModel, StringType, ArrayType} from 'rsuite/Schema';
import GradientText from "@/features/search/components/text-gradient/TextGradient.jsx";
import TextType from '@/features/search/components/text-type/TextType.jsx';
import {FeedList} from "@/features/search/components/feed-list/FeedList.jsx";
import {SummaryList} from "@/features/search/components/summary-list/SummaryList.jsx";
import {UserFeeds} from "@/features/search/components/user-feeds/UserFeeds.jsx";
import {SourceSuggestions} from "@/features/search/components/source-suggestions/SourceSuggestions.jsx";
import {CustomNavbar} from '../features/navbar/components/Navbar.jsx'
import {SearchApi} from "@/features/search/api/searchApi.js";
import {FeedApi} from "@/features/search/api/feedApi.js";
import {CustomSearchApi} from "@/features/custom-search/api/customSearchApi.js";

// rsuite SelectPicker data
const languageOptions = [
    {value: 'en', label: 'English'},
    {value: 'fr', label: 'French'},
    {value: 'es', label: 'Spanish'},
    {value: 'de', label: 'German'},
    {value: 'it', label: 'Italian'},
];

// hours: news not older than this, null: no limit or a range chosen by the user
const timeframeOptions = [
    {value: 'h', label: 'Last Hour', hours: 1},
    {value: 'd', label: 'Last 24 Hours', hours: 24},
    {value: 'w', label: 'Last 7 Days', hours: 24 * 7},
    {value: 'm', label: 'Last 30 Days', hours: 24 * 30},
    {value: 'a', label: 'All Time', hours: null},
    {value: 'c', label: 'Custom range...', hours: null},
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

const Field = forwardRef((props, ref) => {
    const {name, message, label, accepter, error, ...rest} = props;
    return (
        <Form.Group controlId={`${name}-10`} ref={ref} className={error ? 'has-error' : ''}>
            <Form.Label>{label} </Form.Label>
            <Form.Control name={name} accepter={accepter} errorMessage={error} {...rest} />
            <Form.Text>{message}</Form.Text>
        </Form.Group>
    );
});

// examples shown by the "i" next to the Keywords field
const KEYWORD_EXAMPLES = [
    ['referee, VAR', 'one or the other'],
    ['red card', 'both words, in any order'],
    ['"red card"', 'this exact phrase'],
    ['referee -rugby', 'referee, but never rugby'],
    ['-"red card"', 'excludes an exact phrase too'],
];

const keywordsHelp = (
    <Popover title="How to write keywords" style={{maxWidth: 380}}>
        <Text muted size="sm" marginBottom={10}>
            Searched in the title, the description and the categories of the news.
        </Text>
        <table>
            <tbody>
            {KEYWORD_EXAMPLES.map(([example, meaning]) => (
                <tr key={example}>
                    <td style={{padding: '3px 12px 3px 0', whiteSpace: 'nowrap'}}>
                        <code>{example}</code>
                    </td>
                    <td style={{padding: '3px 0'}}>{meaning}</td>
                </tr>
            ))}
            </tbody>
        </table>
        <Text muted size="sm" marginTop={10}>
            A word also finds its variants: <code>referee</code> finds "referees".
            Words of 3 letters or less must match a whole word, so <code>VAR</code> does not find "Alvarez".
        </Text>
    </Popover>
);

const model = SchemaModel({
    keyword: StringType()
        .isRequired('At least 1 keyword required.'),
    category: ArrayType()
        .minLength(1, 'Please select at least 1 category.')
        .isRequired('At least 1 category required.'),
    language: StringType()
        .minLength(1, 'Please select a language.')
        .isRequired('A language required.'),
    // timeframe: ArrayType()
    //     .minLength(1, 'Please select a timeframe.')
    //     .isRequired('A timeframe required.')
});

export const SearchPage = () => {
    const navigate = useNavigate();
    const [newsList, setNewsList] = useState([])
    // AI resumes of the selected news
    const [summaries, setSummaries] = useState([])
    const summaryListRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [categoryOptions, setCategoryOptions] = useState([])
    const [customSearchItems, setCustomSearchItems] = useState([])
    const [isLoading, setIsLoading] = useState(false);
    const hasSearched = useRef(false);
    const [token, setToken] = useState(localStorage.getItem("JWT"))
    const [user, setUser] = useState(token ? jwtDecode(token) : null)
    // form
    const formRef = useRef();
    const [formError, setFormError] = useState({});
    const [formValue, setFormValue] = useState({
        id: null,
        title: '',
        keyword: '',
        category: [],
        timeframe: 'd',
        language: ''
    });
    const [customRange, setCustomRange] = useState(null);
    const [showSources, setShowSources] = useState(false);
    // the search that gave the results, used to look for the media missing from the sources
    const [lastSearch, setLastSearch] = useState(null);
    const [sourcesVersion, setSourcesVersion] = useState(0);
    // modal
    const [saveSearchModal, setSaveSearchModal] = useState(false);
    const handleOpen = () => setSaveSearchModal(true);
    const handleClose = () => setSaveSearchModal(false);

    const handleSubmit = async () => {
        // check if registered
        if (!user) {
            toaster.push(<Message type="error">Please log in to fetch news</Message>);
            navigate("/login");
            return;
        }

        // check form
        if (!formRef.current.check()) {
            toaster.push(<Message type="error">Missing fields</Message>);
            return;
        }

        setIsLoading(true);
        hasSearched.current = true;

        // Get all links from category
        const search = {
            category: formValue.category,
            keywords: [formValue.keyword],
            language: formValue.language || 'en',
            timeframe: toTimeframe(formValue.timeframe, customRange),
        };
        const allNews = await SearchApi.getNews(search, token);
        setLastSearch(search);

        // print error message
        if (allNews && allNews.error && allNews.error.includes('Forbidden, invalid or expired')) {
            toaster.push(<Message type="error">Token is invalid or has expired, please log in</Message>);
            removeAuthCredentials()
        } else if (allNews && allNews.error) {
            toaster.push(<Message type="error">An error has occurred.. Please try again.</Message>);
        }

        setNewsList(allNews.news);
        setIsLoading(false);
    };

    // AI resume of the selected news (the server scrapes them first)
    const handleGenerate = async (urls) => {
        setIsGenerating(true);
        const data = await SearchApi.getNewsSummary(urls, token);
        setIsGenerating(false);

        if (data && data.error && data.error.includes('Forbidden, invalid or expired')) {
            toaster.push(<Message type="error">Token is invalid or has expired, please log in</Message>);
            removeAuthCredentials()
            return;
        } else if (!data || data.error) {
            toaster.push(<Message type="error">An error has occurred.. Please try again.</Message>);
            return;
        }

        const summaryCount = data.news.filter(news => news.summary).length;
        toaster.push(<Message type="success">{summaryCount} / {data.news.length} news summarized.</Message>);
        setSummaries(data.news);
    };

    // categories of feeds that can be searched, they belong to the language chosen
    useEffect(() => {
        SearchApi.getCategories(formValue.language || 'en')
            .then(data => setCategoryOptions(data.categories))
            .catch(e => console.error("Failed to fetch categories", e));
    }, [formValue.language]);

    // show the resumes once generated
    useEffect(() => {
        if (summaries.length > 0) {
            summaryListRef.current?.scrollIntoView({behavior: 'smooth'});
        }
    }, [summaries]);

    const handleSaveSearch = async () => {
        if (!user.id) {
            toaster.push(<Message type="error">You must be logged in...</Message>);
            return;
        }
        if (!formValue.title) {
            toaster.push(<Message type="error">You must enter a title...</Message>);
            return;
        }
        if (!formValue.language) {
            toaster.push(<Message type="error">You must select a language...</Message>);
            return;
        }
        if (!formValue.keyword) {
            toaster.push(<Message type="error">You must enter a keyword at least...</Message>);
            return;
        }
        if (formValue.category.length < 1) {
            toaster.push(<Message type="error">You must select at least 1 category...</Message>);
            return;
        }
        try {
            const data = await CustomSearchApi.postUserCustomSearch({
                id: formValue.id,
                title: formValue.title,
                language: formValue.language,
                keyword: formValue.keyword,
                category: formValue.category,
            }, token);
console.log(data);
            // close modal
            handleClose()

            // save custom search locally !! to implement
            // const newTags = customSearchItems.push(item => item !== tag);
            // setCustomSearchItems(newTags)

            // success message
            if (!formValue.id) {
                toaster.push(<Message type="success">{formValue.title} created successfully !</Message>);
            } else {
                toaster.push(<Message type="success">{formValue.title} modified successfully !</Message>);
            }
        } catch (e) {
            console.error("Failed to fetch searches", e);
            // error message
            if (!formValue.id) {
                toaster.push(<Message type="error">Error while creating {formValue.title}...</Message>);
            } else {
                toaster.push(<Message type="error">Error while modifying {formValue.title}...</Message>);
            }
        }
    }

    const handleSelectPicker = (item) => {
        setFormValue({
            title:item.title,
            id: item.id,
            keyword: item.keyword,
            category: item.category,
            timeframe: formValue.timeframe,
            language: item.language
        })
    }

    const removeTag = async (tag) => {
        try {
            const data = await CustomSearchApi.deleteUserCustomSearch({id: tag.value.id}, token);

            if (!data) {
                toaster.push(<Message type="error">Error deleting {tag.value.title}...</Message>);
                return
            }
            const nextTags = customSearchItems.filter(item => item !== tag);

            toaster.push(<Message type="success">{tag.value.title} deleted successfully !</Message>);

            setCustomSearchItems(nextTags);
        } catch (e) {
            console.error("Failed to remove search", e);
        }
    };

    const removeAuthCredentials = () => {
        localStorage.removeItem("JWT");
        setToken(null);
        setUser(null);
    }

    useEffect(() => {
        const getUserCustomSearches = async () => {
            if (user) {
                try {
                    const data = await CustomSearchApi.getUserCustomSearch(token);
                    if (data.error && data.error.name.includes("PrismaClientValidationError")) {
                        console.log("Error with Prisma database")
                        return;
                    }

                    const selectPickerData = data.map(item => ({
                        label: item.title,
                        value: item
                    }));
console.log(selectPickerData);
                    setCustomSearchItems(selectPickerData);
                } catch (e) {
                    console.error("Failed to fetch searches", e);
                }
            }
        }

        getUserCustomSearches()
    }, [user, token]);

    return (
        <CustomProvider theme="light">
            <CustomNavbar user={user} removeAuthCredentials={removeAuthCredentials}/>
            <Container className="app-header">
                <Content width={'75vw'} marginTop={50}>
                    <VStack width={'100%'} alignItems={'center'} gap={10}>
                        <VStack width={'100%'} height={'20vh'} marginBottom={10} alignItems={'center'}>
                            <GradientText
                                colors={["#e18e36", "#eabe92", "#ef8717"]}
                                animationSpeed={8}
                                showBorder={false}
                                className="text-6xl font-extrabold"
                            >
                                News Generator
                            </GradientText>
                            <TextType
                                text={["It is a personalizable news generator.", "It must be able to read the news, understand it, and summarize the news it has read, taking into account user parameters such as keywords, desired/undesired topics, language and timeframe of the search."]}
                                className="text-xl font-sans-serif italic"
                                typingSpeed={40}
                                pauseDuration={1500}
                                showCursor
                                cursorCharacter="|"
                                deletingSpeed={15}
                                variableSpeedEnabled={false}
                                variableSpeedMin={60}
                                variableSpeedMax={120}
                                cursorBlinkDuration={0.4}
                            />
                        </VStack>
                        <Card padding={20} width={'75vw'} shaded>
                            <Text fontWeight={'600'} marginBottom={5}>Saved custom searches</Text>
                            <SelectPicker
                                marginBottom={10}
                                width={'100%'}
                                data={customSearchItems}
                                placeholder={"Use a custom search..."}
                                onSelect={(value) => {
                                    handleSelectPicker(value)
                                }}
                            />
                            <TagGroup marginBottom={15}>
                                {customSearchItems.map((item, index) => (
                                    <Tag key={index} color="orange" closable onClose={() => removeTag(item)}>
                                        {item.label}
                                    </Tag>
                                ))}
                            </TagGroup>
                            <Form fluid
                                  width={'100%'}
                                  ref={formRef}
                                  onChange={setFormValue}
                                  onCheck={setFormError}
                                  formValue={formValue}
                                  model={model}
                            >
                                <Form.Stack width={'100%'}>
                                    <Form.Group controlId="keyword">
                                        <Form.Label fontWeight={'600'}>
                                            <HStack spacing={6} alignItems="center">
                                                Keywords
                                                <Whisper placement="right" trigger={['hover', 'focus', 'click']}
                                                         speaker={keywordsHelp}>
                                                    <Button appearance="subtle" size="xs" circle
                                                            aria-label="How to write keywords"
                                                            style={{padding: 0, color: '#e28e36'}}>
                                                        <FaInfoCircle/>
                                                    </Button>
                                                </Whisper>
                                            </HStack>
                                        </Form.Label>
                                        <Form.Control checkAsync name="keyword" id="keyword"
                                                      placeholder='e.g., referee -rugby, "red card"'/>
                                        <Form.HelpText>
                                            Comma = or, several words = all of them, "quotes" = exact phrase, -word = exclude
                                        </Form.HelpText>
                                    </Form.Group>
                                    <Form.Stack direction={'row'} width={'100%'} fontWeight={'600'}>
                                        <Field
                                            name="language"
                                            label="Language"
                                            placeholder={"Select a language..."}
                                            accepter={SelectPicker}
                                            data={languageOptions}
                                            defaultValue={'en'}
                                            error={formError.language}
                                            block
                                        />
                                        <Field
                                            name="timeframe"
                                            label="Timeframe"
                                            message={formValue.timeframe === 'c' ? '' : 'News published in this period'}
                                            placeholder={"Select a timeframe..."}
                                            accepter={SelectPicker}
                                            data={timeframeOptions}
                                            searchable={false}
                                            cleanable={false}
                                            error={formError.timeframe}
                                            block
                                        />
                                    </Form.Stack>
                                    {formValue.timeframe === 'c' && (
                                        <Form.Group controlId="customRange">
                                            <Form.Label fontWeight={'600'}>From / to</Form.Label>
                                            <DateRangePicker value={customRange} onChange={setCustomRange}
                                                             format="dd.MM.yyyy HH:mm" block
                                                             shouldDisableDate={date => date > new Date()}/>
                                            <Form.HelpText>
                                                News published between these two dates
                                            </Form.HelpText>
                                        </Form.Group>
                                    )}
                                    <Form.Stack fontWeight={'600'}>
                                        <Field
                                            name="category"
                                            label="Category"
                                            accepter={CheckboxGroup}
                                            error={formError.category}
                                            inline
                                        >
                                            {categoryOptions.map(category => (
                                                <Checkbox key={category} value={category} color={'orange'}>
                                                    {category.charAt(0).toUpperCase() + category.slice(1)}
                                                </Checkbox>
                                            ))}
                                        </Field>
                                    </Form.Stack>
                                    <Form.Group controlId="sources">
                                        <Form.Label fontWeight={'600'}>
                                            <HStack spacing={6} alignItems="center">
                                                My sources
                                                <Button appearance="subtle" size="xs"
                                                        onClick={() => setShowSources(!showSources)}
                                                        style={{padding: '0 6px', color: '#e28e36'}}>
                                                    {showSources ? 'hide' : 'show'}
                                                </Button>
                                            </HStack>
                                        </Form.Label>
                                        {showSources && (
                                            <UserFeeds token={token} categories={categoryOptions} api={FeedApi}
                                                       reloadKey={sourcesVersion}
                                                       language={formValue.language || 'en'}/>
                                        )}
                                        <Form.HelpText>
                                            Websites you add are searched with the others, but only in your searches
                                        </Form.HelpText>
                                    </Form.Group>
                                </Form.Stack>
                                <ButtonToolbar mt={20}>
                                    <Button appearance="primary" name='fetchNews' color={'orange'}
                                            onClick={handleSubmit}
                                            loading={isLoading}>
                                        Search
                                    </Button>
                                    <Button appearance="ghost" name='save' color={'orange'} onClick={handleOpen}> Save
                                        search</Button>
                                </ButtonToolbar>

                                <Modal open={saveSearchModal} onClose={handleClose}>
                                    <Modal.Header>
                                        <Modal.Title>Save your custom search</Modal.Title>
                                    </Modal.Header>
                                    <Modal.Body>
                                        <Form fluid onChange={setFormValue} formValue={formValue}>
                                            <Form.Group controlId="title">
                                                <Form.ControlLabel fontWeight={'600'}>Search title</Form.ControlLabel>
                                                <Form.Control name="title"/>
                                            </Form.Group>
                                        </Form>
                                    </Modal.Body>
                                    <Modal.Footer>
                                        <Button onClick={handleClose} appearance="subtle" color={'orange'}>
                                            Cancel
                                        </Button>
                                        <Button onClick={handleSaveSearch} onToggle={handleSaveSearch} appearance="primary" color={'orange'}>
                                            Save
                                        </Button>
                                    </Modal.Footer>
                                </Modal>
                            </Form>
                        </Card>
                        <SummaryList ref={summaryListRef} summaries={summaries}/>
                        {lastSearch && (
                            <SourceSuggestions token={token} api={FeedApi} search={lastSearch}
                                               categories={categoryOptions}
                                               onImported={() => setSourcesVersion(sourcesVersion + 1)}/>
                        )}
                        <FeedList newsList={newsList} onGenerate={handleGenerate} isGenerating={isGenerating}/>
                    </VStack>
                </Content>
            </Container>
        </CustomProvider>
    )
}