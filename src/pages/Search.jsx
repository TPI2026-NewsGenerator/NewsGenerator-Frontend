//
//  Author: Fabian Rostello
//  Date: 03.04.2026
//  File: Search.jsx
//  Description: 
//

import {forwardRef, useEffect, useRef, useState} from "react";
import {
    Button,
    Container,
    Content,
    CustomProvider,
    VStack,
    Form, Checkbox, CheckboxGroup, toaster, Message, ButtonToolbar, SelectPicker, Card, Popover, Dropdown, Whisper,
    Header, Text, Stack
} from "rsuite";
import AdminIcon from '@rsuite/icons/Admin';
import {useNavigate} from "react-router-dom";
import {jwtDecode} from "jwt-decode";
import {SchemaModel, StringType, ArrayType} from 'rsuite/Schema';
import TextPressure from '../features/news-feed/components/text-pressure/TextPressure.jsx';
import TextType from '../features/news-feed/components/text-type/TextType.jsx';
import {FeedList} from "../features/news-feed/components/feed-list/FeedList.jsx";
import {NewsApi} from "../features/news-feed/api/newsApi.js";
import {CustomSearchApi} from "@/features/search-history/api/customSearchApi.js";

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
        .isRequired('This field is required.'),
    language: StringType()
        .minLength(1, 'Please select a language.')
        .isRequired('This field is required.'),
    // timeframe: ArrayType()
    //     .minLength(1, 'Please select a timeframe.')
    //     .isRequired('This field is required.')
});

export const FetchPage = () => {
    const navigate = useNavigate();
    const [newsList, setNewsList] = useState([])
    const [isLoading, setIsLoading] = useState(false);
    const hasSearched = useRef(false);
    const [token, setToken] = useState(localStorage.getItem("JWT"))
    const [user, setUser] = useState(token ? jwtDecode(token) : null)
    const [customSearch, setCustomSearch] = useState(false);
    const formRef = useRef();
    const [formError, setFormError] = useState({});
    const [formValue, setFormValue] = useState({
        keyword: '',
        category: ['world'],
        language: 'en'
    });

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
        const allNews = await NewsApi.getNews({
            category: formValue.category,
            keywords: [formValue.keyword]
        }, token);

console.log('App: allNews: ');
console.log(allNews);

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

    const handleLogout = () => {
        if (token) {
            removeAuthCredentials()
            // navigate('/login')
        }
    }

    const removeAuthCredentials = () => {
        localStorage.removeItem("JWT");
        setToken(null);
        setUser(null);
    }

    useEffect(() => {
        // Get user custom searches
        const userCustomSearches = async () => {
            setCustomSearch(await CustomSearchApi.getUserCustomSearch(user.id, token))
        };

        userCustomSearches()
    }, []);

    return (
        <CustomProvider theme="light">
            <Container className="app-header">
                {user && (
                    <Header width={'100%'} display={'flex'} justifyContent={'flex-end'}>
                        <Whisper
                            placement="bottomEnd"
                            trigger="click"
                            // speaker={RenderSpeaker(user)}
                            speaker={(props, ref) => (
                                <RenderSpeaker
                                    {...props}
                                    ref={ref}
                                    user={user}
                                    onLogout={handleLogout}
                                />
                            )}
                        >
                            <AdminIcon size="2rem"/>
                        </Whisper>
                    </Header>
                )}
                <Content width={'75vw'}>
                    <VStack width={'100%'} alignItems={'center'} gap={20}>
                        <VStack width={'100%'} marginBottom={50}>
                            <TextPressure
                                text="News Generator"
                                flex
                                alpha={false}
                                stroke={true}
                                width={true}
                                weight={true}
                                italic={true}
                                textColor="#F2E3D5"
                                strokeColor="#BFA584"
                                minFontSize={36}
                            />
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
                        {/*<Text as='blockquote' margin={20}>It is a personalizable news generator.*/}
                        {/*    It must be able to read the news, understand it, and summarize the news it has read, taking*/}
                        {/*    into account user parameters such as keywords, desired/undesired topics, language and*/}
                        {/*    timeframe of the search.</Text>*/}
                        <Card padding={20} width={'75vw'} shaded>
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
                                        <Form.Label>Keywords</Form.Label>
                                        <Form.Control checkAsync name="keyword" id="keyword"
                                                      placeholder="e.g., artificial intelligence, climate change, innovations"/>
                                    </Form.Group>
                                    <Form.Group controlId="undesiredTopic">
                                        <Form.Label>Undesired Topics</Form.Label>
                                        <Form.Control disabled={true} checkAsync name="undesiredTopic"
                                                      id="undesiredTopic"
                                                      placeholder="e.g., celebrity gossip, sports scores"/>
                                    </Form.Group>
                                    <Form.Stack direction={'row'} width={'100%'}>
                                        <Field
                                            name="language"
                                            label="Language"
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
                                            accepter={SelectPicker}
                                            data={timeframeOptions}
                                            error={formError.language}
                                            disabled={true}
                                            block
                                        />
                                    </Form.Stack>
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
                                <ButtonToolbar mt={20}>
                                    <Button appearance="primary" name='fetchNews' color={'orange'}
                                            onClick={handleSubmit}
                                            loading={isLoading}>
                                        Fetch NewsApi
                                    </Button>
                                </ButtonToolbar>
                            </Form>
                        </Card>
                        <FeedList newsList={newsList}/>
                    </VStack>
                </Content>
            </Container>
        </CustomProvider>
    )
}

const RenderSpeaker = forwardRef(({onClose, left, top, className, user, onLogout}, ref) => {
    const handleLogoutClick = () => {
        onLogout();
        onClose();
    };

    return (
        <Popover ref={ref} className={className} style={{left, top}} full>
            <Dropdown.Menu onSelect={onClose}>
                <Dropdown.Item panel style={{padding: 10, width: 160}}>
                    <Stack spacing={6} wrap>
                        <Text>Signed in as</Text>
                        <Text as="b">{user.username}</Text>
                    </Stack>
                    {/*<Text>Signed in as {user.username}</Text>*/}
                    <Text muted>{user.role === 1 ? "Administrateur" : "Utilisateur"}</Text>
                </Dropdown.Item>
                <Dropdown.Item divider/>
                <Dropdown.Item>Profile & account</Dropdown.Item>
                <Dropdown.Item divider/>
                <Dropdown.Item>Settings</Dropdown.Item>
                <Dropdown.Item onClick={handleLogoutClick}>Sign out</Dropdown.Item>
            </Dropdown.Menu>
        </Popover>
    );
});