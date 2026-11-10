//
//  Author: Fabian Rostello
//  Date: 10.11.2026
//  File: MailSameNews.jsx
//  Description: The message that comes when a news imported from another profile tells the same news as a card of the briefing (the user,
//               10.11.2026): the reader chooses which of the two versions they want to use, the other goes among its other angles and its media
//               join "Also covered by"; or keeps both. Nothing is ever refused: this is only offered
//

import {Button} from "@/components/ui/button.jsx";
import {Dialog} from "@/components/ui/overlay.jsx";
import {two} from "@/features/briefing/useMailDraft.js";

// one of the two versions: where it comes from, its title, its medium and how many media tell it, its first point (the two often have the same
// title: the points tell them apart), and the button that keeps it
const Version = ({kicker, title, source, media, excerpt, busy, disabled, onKeep}) => (
    <div className="flex min-w-0 flex-col rounded-xl bg-paper-deep p-4">
        <p className="kicker">{kicker}</p>
        <p className="mt-2 line-clamp-3 text-[0.9375rem] leading-snug font-medium">{title}</p>
        <p className="caption mt-1">{[source, media > 0 && `told by ${media} ${media === 1 ? 'medium' : 'media'}`].filter(Boolean).join(' · ')}</p>
        {excerpt && <p className="mt-2 line-clamp-4 flex-1 text-[0.8125rem] leading-snug text-ink-mute">{excerpt}</p>}
        <Button size="sm" variant="primary" className="mt-4 self-start" onClick={onKeep} loading={busy} disabled={disabled}>Use this one</Button>
    </div>
);

const pick = ({title, source, media, excerpt}) => ({title, source, media, excerpt});

// same: {title, source, media, excerpt, profile, similar: {number, title, source, media, excerpt}}, the news imported and the card of the briefing that tells the same news;
// busy: 'similar' or 'imported' while the two are being made one; onKeep('similar' | 'imported'): the version the reader keeps; onClose: keep both
export const MailSameNews = ({same, busy = null, onKeep, onClose}) => (
    <Dialog open onOpenChange={open => { if (!open && busy === null) onClose(); }} title={`Same news as card ${two(same.similar.number)}`}
            description="The news you imported tells the same news as a card of this briefing. Use the version you prefer: the other goes among its other angles, and its media join “Also covered by”."
            footer={<Button variant="quiet" onClick={onClose} disabled={busy !== null}>Keep both</Button>}>
        <div className="grid gap-3 md:grid-cols-2">
            <Version kicker={`Card ${two(same.similar.number)} of this briefing`} {...pick(same.similar)}
                     busy={busy === 'similar'} disabled={busy !== null} onKeep={() => onKeep('similar')}/>
            <Version kicker={`Imported from ${same.profile ?? 'another profile'}`} {...pick(same)}
                     busy={busy === 'imported'} disabled={busy !== null} onKeep={() => onKeep('imported')}/>
        </div>
    </Dialog>
);
