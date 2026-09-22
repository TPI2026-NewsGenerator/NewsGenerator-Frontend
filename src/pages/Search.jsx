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
    Tag, Text, HStack, TagGroup, Modal, CheckPicker
} from "rsuite";
import {useNavigate} from "react-router-dom";
import {jwtDecode} from "jwt-decode";
import {SchemaModel, StringType, ArrayType} from 'rsuite/Schema';
import GradientText from "@/features/search/components/text-gradient/TextGradient.jsx";
import TextType from '@/features/search/components/text-type/TextType.jsx';
import {FeedList} from "@/features/search/components/feed-list/FeedList.jsx";
import {SummaryList} from "@/features/search/components/summary-list/SummaryList.jsx";
import {CustomNavbar} from '../features/navbar/components/Navbar.jsx'
import {SearchApi} from "@/features/search/api/searchApi.js";
import {CustomSearchApi} from "@/features/custom-search/api/customSearchApi.js";

// rsuite SelectPicker data
const languageOptions = [
    {value: 'en', label: 'English'},
    {value: 'fr', label: 'French'},
    {value: 'es', label: 'Spanish'},
    {value: 'ch', label: 'Chinese'},
    {value: 'ru', label: 'Russian'},
];

const timeframeOptions = [
    {value: 'h', label: 'Last Hour'},
    {value: 'd', label: 'Last 24 Hours'},
    {value: 'w', label: 'Last 7 Days'},
    {value: 'm', label: 'Last 30 Days'},
    {value: 'a', label: 'All Time'}
];

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
    const [topicOptions, setTopicOptions] = useState([])
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
        topics: [],
        undesiredTopics: [],
        language: ''
    });
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
        const allNews = await SearchApi.getNews({
            category: formValue.category,
            topics: formValue.topics ?? [],
            undesiredTopics: formValue.undesiredTopics ?? [],
            keywords: [formValue.keyword]
        }, token);

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

    // topics for the topics filter
    useEffect(() => {
        SearchApi.getTopics()
            .then(data => setTopicOptions(data.topics.map(topic => ({
                value: topic,
                label: topic.charAt(0).toUpperCase() + topic.slice(1)
            }))))
            .catch(e => console.error("Failed to fetch topics", e));
    }, []);

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
                topics: formValue.topics ?? [],
                undesiredTopics: formValue.undesiredTopics ?? [],
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
            topics: item.topics ?? [],
            undesiredTopics: item.undesiredTopics ?? [],
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
                                        <Form.Label fontWeight={'600'}>Keywords</Form.Label>
                                        <Form.Control checkAsync name="keyword" id="keyword"
                                                      placeholder="e.g., artificial intelligence, climate change, innovations"/>
                                        <Form.HelpText>
                                            Separate alternatives with commas. Use quotes for an exact word or phrase, e.g. referee, "red card"
                                        </Form.HelpText>
                                    </Form.Group>
                                    <Form.Group controlId="topics">
                                        <Form.Label fontWeight={'600'}>Topics</Form.Label>
                                        <Form.Control name="topics" accepter={CheckPicker} data={topicOptions}
                                                      disabledItemValues={formValue.undesiredTopics ?? []}
                                                      placeholder="All topics" searchable={false} block/>
                                        <Form.HelpText>
                                            Only news of these topics, classified by the AI
                                        </Form.HelpText>
                                    </Form.Group>
                                    <Form.Group controlId="undesiredTopics">
                                        <Form.Label fontWeight={'600'}>Undesired Topics</Form.Label>
                                        <Form.Control name="undesiredTopics" accepter={CheckPicker} data={topicOptions}
                                                      disabledItemValues={formValue.topics ?? []}
                                                      placeholder="None" searchable={false} block/>
                                        <Form.HelpText>
                                            News of these topics are hidden
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
                                            disabledItemValues={['fr', 'es', 'ch', 'ru']}
                                            error={formError.language}
                                            block
                                        />
                                        <Field
                                            name="timeframe"
                                            label="Timeframe"
                                            placeholder={"Select a timeframe..."}
                                            accepter={SelectPicker}
                                            data={timeframeOptions}
                                            error={formError.language}
                                            disabled={true}
                                            block
                                        />
                                    </Form.Stack>
                                    <Form.Stack fontWeight={'600'}>
                                        <Field
                                            name="category"
                                            label="Category"
                                            accepter={CheckboxGroup}
                                            error={formError.category}
                                            inline
                                        >
                                            <Checkbox value={'world'} color={'orange'}>World</Checkbox>
                                            <Checkbox value={'press'} color={'orange'}>Press</Checkbox>
                                            <Checkbox value={'sport'} color={'orange'}>Sport</Checkbox>
                                        </Field>
                                    </Form.Stack>
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
                        <FeedList newsList={newsList} onGenerate={handleGenerate} isGenerating={isGenerating}/>
                    </VStack>
                </Content>
            </Container>
        </CustomProvider>
    )
}