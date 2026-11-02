//
//  Author: Fabian Rostello
//  Date: 03.11.2026
//  File: mailAdd.js
//  Description: What the tab of the news of the names followed needs to put a news in the e-mail of the
//               briefing (the user, 03.11.2026: "ajouter les news des noms exacts au brief mail"): the card
//               of the briefing that already tells it, ticked or not, or a way to add it as a card
//

import {createContext} from "react";

// null outside the page of the briefing, and for a reader who cannot send e-mails: the news have no button.
// Otherwise {cardOf(news), numberOf(card), isTicked(card), tick(card, checked), add(news)}: cardOf gives the
// card of the briefing telling that news (the same story, or one of its articles at the same address), null
// when it is not in it; add(news) reads the page of the news and adds it at the end of the briefing, ticked,
// and answers true once it is
export const MailAddContext = createContext(null);

// the card of the briefing telling the news of the list: by its story, else by the address of one of its articles
export const cardTelling = (items, news) => items.find(item =>
    (news.storyId != null && (item.storyId === news.storyId || (item.mergedStoryIds ?? []).includes(news.storyId)))
    || [item.lead, ...(item.articles ?? [])].some(article => article?.url && article.url === news.url)) ?? null;
