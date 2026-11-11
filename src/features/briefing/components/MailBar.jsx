//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: MailBar.jsx
//  Description: The bar of the cards ticked in the briefing: how many, and the button that opens the editor of the e-mail (see
//               MailEditor and MailMatrix, the layout the reader chose in their settings), where their order, title, sentences,
//               picture, countries and the blocks each carries are chosen before it is sent to the address of the account or another
//

import {Button} from "@/components/ui/button.jsx";
import {MailEditor} from "@/features/briefing/components/MailEditor.jsx";
import {MailMatrix} from "@/features/briefing/components/MailMatrix.jsx";
import {keptLayout} from "@/features/briefing/mailEditorLayout.js";
import {useMailDraft} from "@/features/briefing/useMailDraft.js";

// stories: the cards ticked, in the order of the briefing, [{storyId, title, why, titleAsPublished, titleProposal, titleLanguage, titleTranslated, number, thumbnail,
// thumbnailSource, countries, ai, analysis, contested, angles, official, names, hedged, media, affair, hasArticles}] (number: their place in the
// briefing; countries: the codes ISO 3166-1 the server found for them; ai: the points and the summary written by the AI, see BriefingCard
// AiVersion; own: {points, digest} the same of the article as published, its paragraphs split by a blank line); accountEmail: the address of
// the account; format: the way the page shows the sentences of the cards (see formats.js), the one of the e-mail until the reader chooses another,
// null for a briefing that has the key passages only; onSend(to, storyIds, pictures, titles, removed, format, ai, texts, countries, theme,
// blocks, descriptions): sends them in this order with the pictures and the titles the reader changed, without what they took out, their sentences in the way
// chosen, the ones of 'ai' (storyIds) in their AI version, the ones of 'texts' ({storyId: [paragraph]}) as the reader wrote them, 'countries'
// ({storyId: [code]}) as the reader chose them, in the 'theme' (light, the one at first, or dark) the reader chose for the colours of the e-mail,
// the 'blocks' each story carries ({storyId: {contested, official, ...}}, see mailBlocks.js), true when sent; onPreview(payload): {html}, the
// e-mail as it will be sent, drawn by the server for what is in the editor; onPictures(storyId): {pictures}, the ones of a story;
// onNeutralTitle(storyId): {title} or {title: null, reason}, the neutral title the AI proposes for a story, shown against its title (see
// MailNeutralTitle), none offered without it; onWriteAi(storyId): the AI version of a story that has none, written now, {ai} or {ai: null, reason}
// (see AiVersionWriter), none offered without it; onClear: unticks them all; layout: 'frames' or 'matrix', the one chosen in the settings;
// onProfilesNews(): {profiles: [...]}, the news of the briefings of the other profiles, and onCopyNews(fromBriefingId, storyId): one of them
// copied into the briefing and ticked, answering the storyId it has there (null when refused): the editor offers to import one from a profile
// (see MailImport), none without them; onFoldNews(keep, drop): two cards of the same news made one, the card 'keep' staying with 'drop' folded
// into it, true when done (see MailSameNews, offered when a news imported tells the same news as a card of the briefing)
export const MailBar = ({stories, accountEmail, format = null, sending, onSend, onPreview, onPictures, onNeutralTitle, onWriteAi, onProfilesNews, onCopyNews, onFoldNews, onClear, layout = keptLayout()}) => {
    const draft = useMailDraft({stories, accountEmail, format, onPictures, onWriteAi, onProfilesNews, onCopyNews, onFoldNews});
    // the editor hands over what it made: the address and the e-mail, in the order the page's function takes them
    const send = (address, sent) => onSend(address, sent.storyIds, sent.pictures, sent.titles, sent.removed, sent.way, sent.ai, sent.texts, sent.countries, sent.theme, sent.blocks, sent.descriptions);
    const Editor = layout === 'matrix' ? MailMatrix : MailEditor;

    return (
        <>
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper/85 backdrop-blur-xl backdrop-saturate-150">
                <div className="page flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                    <p className="folio !text-ink">{stories.length} {stories.length === 1 ? 'story' : 'stories'} ticked</p>
                    <div className="flex gap-2">
                        <Button variant="subtle" size="sm" onClick={onClear}>Untick all</Button>
                        <Button variant="primary" size="sm" onClick={draft.open}>Send email</Button>
                    </div>
                </div>
            </div>
            {draft.to !== null && (
                <Editor draft={draft} sending={sending} onSend={send} onPreview={onPreview} onNeutralTitle={onNeutralTitle}/>
            )}
        </>
    );
};
