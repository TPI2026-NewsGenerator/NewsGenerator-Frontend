//
//  Author: Fabian Rostello
//  Date: 22.09.2026
//  File: SummaryList.jsx
//  Description: AI resumes of the selected news, used in Search Page
//

import {forwardRef} from "react";
import {Button, Card, Heading, Message, Tag, TagGroup, Text, VStack} from "rsuite";
import {FaExternalLinkAlt} from "react-icons/fa";

export const SummaryList = forwardRef(({summaries}, ref) => {
    if (!summaries || summaries.length === 0) return null;

    return (
        <VStack ref={ref} align="stretch" width={'75vw'} gap={20} marginTop={50}>
            <Text width={'fit-content'} size={'3xl'} weight={'semibold'} className={'title'}>
                Your AI Resume
            </Text>
            {summaries.map(news => (
                <Card key={news.url} padding={20} shaded>
                    <Card.Header>
                        <TagGroup marginBottom={10}>
                            <Tag size="sm">{news.source}</Tag>
                            {news.publishedAt && (
                                <Tag size="sm">{new Date(news.publishedAt).toLocaleDateString()}</Tag>
                            )}
                            {news.topic && (<Tag size="sm" color="orange">{news.topic}</Tag>)}
                        </TagGroup>
                        <Heading level={5}>{news.title}</Heading>
                    </Card.Header>
                    <Card.Body>
                        {news.summary
                            ? news.summary.split(/\n\s*\n/).map((paragraph, i) => (
                                <Text key={i} marginTop={10}>{paragraph}</Text>
                            ))
                            : <Message type="warning" marginTop={10}>{news.summaryError}</Message>}
                    </Card.Body>
                    <Card.Footer>
                        <Button startIcon={<FaExternalLinkAlt/>} href={news.url} target="_blank" color={'orange'} appearance="ghost">
                            Read the article
                        </Button>
                    </Card.Footer>
                </Card>
            ))}
        </VStack>
    )
})
