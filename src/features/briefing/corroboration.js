//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: corroboration.js
//  Description: What the reader is told about who tells a news, the same on the cards of the briefing
//               and of the search
//

// Past this many articles, a group of the search has stopped being one news. Measured over 522 cards
// in five searches, the largest true group holds eight articles (the eight papers on the diesel export
// ban) and nothing between nine and eleven exists: the bar sits above them. A safety net, no group
// reaches it today
export const RUNNING_STORY = 10;

// Ten media republishing one wire are one report, not ten confirmations: the count of media is
// always given with how many of them wrote their own text. Neither says the news is true, so nothing
// here is called reliable. Two measures: the briefing reads the texts of the articles ({media, read,
// independent, agencies}), the search compares their headlines ({media, wordings}). articles: how many
// articles the card holds, a search group of RUNNING_STORY or more is a running story.
// Answers {text, title, tone}, null when nothing is known
export const coverageLabel = ({media, read, independent, wordings, agencies = []} = {}, {articles = 0} = {}) => {
    if (!media) return null;
    const wire = agencies.length > 0 ? ` · wire: ${agencies.join(', ')}` : '';
    if (media <= 1) return {text: `Only one medium${wire}`, title: 'No other medium of your sources tells this news'};

    const told = `Told by ${media} media`;
    // the texts read
    if (independent !== undefined) {
        if (read < 2) return {text: `${told}, too few texts could be read to compare them${wire}`, title: 'Fewer than two of their texts could be read'};
        if (independent <= 1) {
            return {text: `${told}, one single text republished${wire}`, title: 'Their texts are the same, most likely one wire republished: one report, not several'};
        }
        return {text: `${told}, ${independent} texts written independently of ${read} read${wire}`, tone: 'ink',
            title: `${independent} of the ${read} texts read were written apart from the others`};
    }
    // the headlines only. Identical ones are one wire whatever the size of the group, said first
    if (wordings <= 1) {
        return {text: `${told}, one single text republished`, title: 'They publish the same headline, most likely one wire republished: one report, not several'};
    }
    if (articles >= RUNNING_STORY) {
        return {
            text: `${told}: a running story`,
            title: 'Too many articles here to be a single news: this is a running story, followed from several angles. '
                + `Read the count as the media on the story, not as a news confirmed ${media} times.`,
        };
    }
    return {text: `${told}, ${wordings} own headlines`, tone: 'ink', title: `${wordings} of them wrote their own headline about it`};
};
