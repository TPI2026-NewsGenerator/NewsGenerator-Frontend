//
//  Author: Fabian Rostello
//  Date: 22.09.2026
//  File: SummaryList.jsx
//  Description: The key passages of the cards chosen in the Search Page, read in a sheet above it,
//               set like the stories of the briefing: the passages, who tells it and their articles
//

import {Dialog} from "@/components/ui/overlay.jsx";
import {BriefingCard} from "@/features/briefing/components/BriefingCard.jsx";

// open / onOpenChange: the sheet is closed by its Close link, Escape or a click beside it, and
// opened again from the results
export const SummaryList = ({summaries, open, onOpenChange}) => {
    if (!summaries || summaries.length === 0) return null;

    const done = summaries.filter(news => news.summary).length;

    return (
        <Dialog wide open={open} onOpenChange={onOpenChange} kicker="Chosen by the AI" title="Key passages"
                description={`${done} of ${summaries.length} news read. The sentences are the article's own, the AI only chose them; up to five articles of each news were read to count who wrote it themselves.`}>
            <ol className="list-none p-0">
                {summaries.map((news, index) => (
                    <li key={news.id ?? news.url}>
                        <BriefingCard item={news} number={index + 1} lede={index === 0}/>
                    </li>
                ))}
            </ol>
        </Dialog>
    );
};
