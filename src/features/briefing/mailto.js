//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: mailto.js
//  Description: The cards ticked in the briefing as an e-mail written in the reader's own mail app (a
//               mailto: link): no server sends it, the reader writes the address and sends it from
//               their account
//

// A mail app takes plain text only, and some cut a long link (Outlook on Windows near 2000
// characters): the title, the site and the address of each card always, a passage of each while the
// link stays under it, the first cards first
export const MAILTO_LIMIT = 2000;
const PASSAGE_CHARS = 280;

const titleOf = (item) => item.titleTranslation ?? item.title;

// the first passage of the card, in the reader's language when translated, cut at a word
const passageOf = (item) => {
    const first = (item.translation || item.summary || '').split(/\n\s*\n/)[0].trim();
    if (!first) return null;
    const cut = first.length <= PASSAGE_CHARS ? first : `${first.slice(0, first.lastIndexOf(' ', PASSAGE_CHARS)).trimEnd()}…`;
    return `“${cut}”${item.translation ? ' (machine translation)' : ''}`;
};

const entryOf = (item, i, withPassage) => {
    const lead = item.lead ?? item.articles?.[0];
    return [
        `${i + 1}. ${titleOf(item)}`,
        withPassage ? passageOf(item) : null,
        lead ? `${lead.source} — ${lead.url}` : null,
    ].filter(Boolean).join('\n');
};

// RFC 6068: the lines of the body end with CRLF
const encode = (text) => encodeURIComponent(text.replace(/\r?\n/g, '\r\n'));

// items: the cards ticked, in the order of the briefing. The address is left to the reader
export const mailtoOf = (items) => {
    const subject = items.length === 1 ? titleOf(items[0]) : `${items.length} stories from my NewsGenerator briefing`;
    const linkOf = (passages) => {
        const body = [`${items.length === 1 ? 'A story' : 'Stories'} from my NewsGenerator briefing:`,
            ...items.map((item, i) => entryOf(item, i, passages[i]))].join('\n\n');
        return `mailto:?subject=${encode(subject)}&body=${encode(body)}`;
    };

    let passages = items.map(() => false);
    let link = linkOf(passages);
    items.forEach((item, i) => {
        if (!passageOf(item)) return;
        const more = passages.map((shown, j) => shown || j === i);
        const longer = linkOf(more);
        if (longer.length <= MAILTO_LIMIT) {
            passages = more;
            link = longer;
        }
    });
    return link;
};
