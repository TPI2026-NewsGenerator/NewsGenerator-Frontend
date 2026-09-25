//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: BriefingCard.jsx
//  Description: One story of the briefing: why it was chosen, its summary, who tells it and how
//               many of them wrote it themselves
//

import {useState} from "react";
import {Button, Card, Heading, IconButton, Message, Tag, TagGroup, Text} from "rsuite";
import {FaExternalLinkAlt, FaRegThumbsDown, FaRegThumbsUp, FaStar, FaThumbsDown, FaThumbsUp} from "react-icons/fa";
import {corroborationLabel} from "@/features/briefing/corroboration.js";

// Who the article credits for what it reports, read by the AI while it summarizes. It describes the
// article, never whether the news is true.
const SOURCING = {
    named: {label: 'named sources', color: 'green', title: 'The article names who it credits: a person, an institution, an official statement'},
    anonymous: {label: 'unnamed sources', color: 'yellow', title: 'The article relies on sources it does not name'},
    none: {label: 'no source given', color: 'yellow', title: 'The article credits nobody for what it reports'},
};

const SHOWN_ARTICLES = 4;

// onVote(vote): 'up', 'down', or null when the reader takes back the thumb given. The next briefings
// learn from it; without onVote no thumb is shown
export const BriefingCard = ({item, onVote}) => {
    const [allArticles, setAllArticles] = useState(false);
    const corroboration = corroborationLabel(item.corroboration);
    const articles = allArticles ? item.articles : item.articles.slice(0, SHOWN_ARTICLES);

    return (
        <Card padding={20} shaded>
            <Card.Header>
                <TagGroup marginBottom={10}>
                    {item.publishedAt && <Tag size="sm">{new Date(item.publishedAt).toLocaleString()}</Tag>}
                    {item.topic && <Tag size="sm" color="orange">{item.topic}</Tag>}
                    {item.sourcing && (
                        <Tag size="sm" color={SOURCING[item.sourcing]?.color} title={SOURCING[item.sourcing]?.title}>
                            {SOURCING[item.sourcing]?.label ?? item.sourcing}
                        </Tag>
                    )}
                    {item.hedged && (
                        <Tag size="sm" color="red" title="The article says itself that this is not confirmed">
                            unconfirmed: “{item.hedged}”
                        </Tag>
                    )}
                </TagGroup>
                <Heading level={5}>{item.title}</Heading>
                {item.why && <Text muted marginTop={6} style={{fontStyle: "italic"}}>{item.why}</Text>}
            </Card.Header>

            <Card.Body>
                {item.summary
                    ? item.summary.split(/\n\s*\n/).map((paragraph, i) => <Text key={i} marginTop={10}>{paragraph}</Text>)
                    : <Message type="info" marginTop={10}>No article of this story could be read (paywall or protected site), no summary.</Message>}

                <Tag color={corroboration.color} style={{marginTop: 14}} title={item.corroboration.mediaNames?.join(', ')}>
                    {corroboration.text}
                </Tag>
                {onVote && (
                    <div style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: 14}}>
                        <IconButton
                            size="sm"
                            icon={item.vote === 'up' ? <FaThumbsUp/> : <FaRegThumbsUp/>}
                            color="green" appearance={item.vote === 'up' ? 'primary' : 'subtle'}
                            aria-label="Good for me" aria-pressed={item.vote === 'up'} title="Good for me: more stories like this one"
                            onClick={() => onVote(item.vote === 'up' ? null : 'up')}
                        />
                        <IconButton
                            size="sm"
                            icon={item.vote === 'down' ? <FaThumbsDown/> : <FaRegThumbsDown/>}
                            color="red" appearance={item.vote === 'down' ? 'primary' : 'subtle'}
                            aria-label="Not for me" aria-pressed={item.vote === 'down'} title="Not for me: fewer stories like this one"
                            onClick={() => onVote(item.vote === 'down' ? null : 'down')}
                        />
                    </div>
                )}
            </Card.Body>

            <Card.Footer>
                <ul className="briefing-sources">
                    {articles.map(article => (
                        <li key={article.url}>
                            <a href={article.url} target="_blank" rel="noreferrer">
                                <FaExternalLinkAlt size={11}/> <b>{article.source}</b>
                                {article.trusted && <FaStar size={11} color="var(--rs-yellow-500)" title="A source you trust" aria-label="a source you trust" style={{marginLeft: 4}}/>}
                                {' '}— {article.title}
                            </a>
                        </li>
                    ))}
                </ul>
                {item.articles.length > SHOWN_ARTICLES && (
                    <Button size="sm" appearance="link" onClick={() => setAllArticles(!allArticles)}>
                        {allArticles ? 'Show less' : `Show the ${item.articles.length} articles`}
                    </Button>
                )}
            </Card.Footer>
        </Card>
    );
};
