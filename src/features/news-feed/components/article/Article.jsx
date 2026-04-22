import {memo, useState} from "react";
import {Button, Card, Checkbox, Heading, Tag, TagGroup, Text, VStack} from "rsuite";
import { FaExternalLinkAlt } from "react-icons/fa";
import './Article.css'

export const Article = memo(({ id, onSelect, news }) => {
    const [isChecked, setIsChecked] = useState(false);

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
                    </TagGroup>
                    {news && (<Heading level={6} style={{marginBottom: 5}}>{news?.title}</Heading>)}
                </Card.Header>
                <Card.Body>
                    {news && (<Text marginBottom={30} style={{marginTop: 30}}>{news?.description}</Text>)}
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