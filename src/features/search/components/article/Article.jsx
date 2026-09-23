//
//  Author: Fabian Rostello
//  Date: 19.05.2026
//  File: Article.jsx
//  Description: Article component used in Search Page
//

import {memo, useState} from "react";
import {Button, Card, Checkbox, Heading, Tag, TagGroup, Text, VStack} from "rsuite";
import { FaExternalLinkAlt } from "react-icons/fa";
import './Article.css'

export const Article = memo(({ id, onSelect, news }) => {
    const [isChecked, setIsChecked] = useState(false);

    // the same news can be in two feeds of the same media, show each source once
    const otherSources = [...new Map((news?.sources ?? []).map(other => [other.source, other])).values()];

    // Past this many articles, a group has stopped being one news. Measured over three days in the
    // five languages: 93% of the groups holding several articles hold two to four, and those read
    // as one news. From five up, they are mixed. Some are still one news told by many papers, like
    // the eight on Hakimi's appeal; others are a running story seen from every angle — thirty
    // articles on the White House press ban, from the court filing to the late-night jokes — and a
    // few are only a template, "3 interesting facts about <player>" repeated six times.
    // So above it the card says how many media are on the story, and stops implying one news.
    const RUNNING_STORY = 5;

    // How many media carry this news, and how many of them wrote their own headline. Twenty media
    // repeating one wire is one report seen twenty times; twenty that wrote their own each went and
    // checked. Neither says the news is true, so nothing here is called reliable.
    const coverage = (() => {
        const {media, wordings} = news?.corroboration ?? {};
        if (!media) return null;

        if (media === 1) {
            return {label: 'this source only', color: 'yellow', title: 'No other medium of your sources carries this news'};
        }
        // identical texts are one wire whatever the size of the group, and that is worth saying
        if (wordings === 1) {
            return {
                label: `${media} media, same wording`,
                color: 'cyan',
                title: 'They publish the same text, most likely one wire republished: one report, not several',
            };
        }
        if ((news?.sources?.length ?? 0) + 1 >= RUNNING_STORY) {
            return {
                label: `${media} media on this story`,
                color: 'cyan',
                title: 'Too many articles here to be a single news: this is a running story, followed from '
                    + 'several angles. Read the count as the media on the story, not as a news confirmed '
                    + media + ' times.',
            };
        }
        return {
            label: `${media} media, ${wordings} wordings`,
            color: 'green',
            title: `${wordings} of them wrote their own headline about it`,
        };
    })();

    const handleClick = () => {
        const nextChecked = !isChecked;
        const accepted = onSelect(id, nextChecked);
        if (accepted) setIsChecked(nextChecked);
    };

    const articleTime = (at) => {
        const currentTime = new Date();
        const articleTime = new Date(at);

        // get diff time
        const msDiff = currentTime - articleTime;
        const minDiff = Math.floor(msDiff / (1000 * 60));
        const hourDiff = Math.floor(minDiff / 60);
        const dayDiff = Math.floor(hourDiff / 24);

        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

        if (minDiff < 60) {
            return rtf.format(-minDiff, 'minute');
        } else if (hourDiff < 24) {
            return rtf.format(-hourDiff, 'hour');
        } else {
            return rtf.format(-dayDiff, 'day');
        }
    }

    return (
        <Card className={`article ${isChecked ? 'checked' : ''}`} onClick={handleClick} direction="row" shaded>
            {news && news.thumbnail !== null && (<img
                src={news?.thumbnail}
                alt="Shadow"
                width={200}
                style={{objectFit: 'cover'}}
            />)}
            <VStack spacing={2}>
                <Card.Header>
                    <TagGroup marginBottom={10}>
                        {news && (<Tag size="sm">{news?.source}</Tag>)}
                        {news && (<Tag size="sm">{articleTime(news?.publishedAt)}</Tag>)}
                        {news?.topic && (<Tag size="sm" color="orange">{news.topic}</Tag>)}
                        {coverage && (<Tag size="sm" color={coverage.color} title={coverage.title}>{coverage.label}</Tag>)}
                        {news?.hedged && (
                            <Tag size="sm" color="yellow" title={`The article says "${news.hedged}", so it has no confirmation of its own`}>
                                says "{news.hedged}"
                            </Tag>
                        )}
                    </TagGroup>
                    {news && (<Heading level={6} style={{marginBottom: 5}}>{news?.title}</Heading>)}
                </Card.Header>
                <Card.Body>
                    {news && (<Text marginBottom={30} style={{marginTop: 30}}>{news?.description}</Text>)}
                    {otherSources.length > 0 && (
                        <Text muted size="sm" marginBottom={10}>
                            Also covered by{' '}
                            {otherSources.map((other, index) => (
                                <span key={other.url}>
                                    {index > 0 && ', '}
                                    <a href={other.url} target="_blank" rel="noreferrer"
                                       onClick={event => event.stopPropagation()}>{other.source}</a>
                                </span>
                            ))}
                        </Text>
                    )}
                </Card.Body>
                <Card.Footer>
                    {news && (
                        <Button startIcon={<FaExternalLinkAlt/>} href={news?.url} color={'orange'} appearance="ghost"> Read More</Button>
                    )}
                </Card.Footer>
            </VStack>
            <Checkbox checked={isChecked} position={'absolute'} top={13} right={5} color={'orange'} readOnly/>
        </Card>
    )
})