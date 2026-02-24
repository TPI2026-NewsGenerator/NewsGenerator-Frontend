import {useRef, useState} from 'react'
import {Button, Input, TagPicker, CustomProvider, List, VStack, Heading, Container, Content, Center } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import 'rsuite/TagPicker/styles/index.css';
import './App.css'
import {fetchNews} from "./api/api.js";


const category = ["World", "Sports", "Press"].map(
    item => ({label: item, value: item})
);

function App() {
    const searchTerm = useRef('');
    const hasSearched = useRef(false);
    const [newsList, setNewsList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState([]);

    const handleFetch = async () => {
        setNewsList([]);
        setIsLoading(true);
        hasSearched.current = true;

        // Get all links from category
        const allNews = await fetchNews({
            category: selectedCategory,
            keywords: [searchTerm.current]
        });

        console.log('App: allNews: ');
        console.log(allNews);

        setNewsList(allNews);

        setIsLoading(false);
    }

    return (
        <CustomProvider theme="light">
            <Container className="app-header">
                <Content>
                    <Center style={{height: '100%'}}>
                        <VStack spacing={30} style={{ width: '100%' }} align="center">
                            <VStack spacing={20} style={{ width: '100%', maxWidth: 400 }} align="stretch">
                                <Heading level={1}>News Generator</Heading>
                                <TagPicker placeholder="Select news category" data={category} onChange={(value) => setSelectedCategory(value)}/>
                                <Input
                                    placeholder="Enter search term"
                                    onChange={(value) => searchTerm.current = value}
                                />

                                <Button appearance="primary" onClick={handleFetch} loading={isLoading}>
                                    Fetch News
                                </Button>
                            </VStack>
                            {newsList.length > 0 && (
                                <VStack spacing={20} align="stretch">
                                    <List bordered style={{marginTop: 20}}>
                                        {newsList.map((news, index) => (news && (
                                            <List.Item key={index}>
                                                {news.title && <h6 style={{marginBottom: 5}}>{news.title}</h6>}
                                                {news.publishedTime && <span>{news.publishedTime}</span>} {news.author && <span> by {news.author}</span>}
                                                {news.description && <p style={{marginTop: 30}}>{news.description}</p>}
                                                {news.content && <p style={{marginTop: 30}}>{String(news.content)}</p>}
                                                {news.url && <a href={news.url}>
                                                    <Button appearance="secondary"> Link to article</Button>
                                                </a>}
                                            </List.Item>
                                        )))}
                                    </List>
                                </VStack>
                            )}
                            {hasSearched && !isLoading && newsList.length === 0 && (<h6>No results found...</h6>)}
                        </VStack>
                    </Center>
                </Content>
            </Container>
        </CustomProvider>
    );
}

export default App
