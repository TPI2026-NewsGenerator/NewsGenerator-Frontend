//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: timelineEvents.js
//  Description: The dated things the map holds, as the events of the timeline: the date a position appeared in the news (a key event when it
//               changed), the date a reader set a position (a vote, hollow when it says "no position"), a day with Uncertain signals and
//               no position (a hollow marker)
//

import {candidateFill, labelOf, readEntry, sideFill, sideOf, strengthOf} from "@/features/fifa/positions.js";

const dateOf = (at) => new Date(at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});

// the dated things the map holds: [{id, at, kind, label, title, fill, hollow, weight, qid, text}]
export const eventsOf = (rows, scope, levels, subjects) => {
    const events = [];
    for (const {member, visible} of rows.values()) {
        if (!visible) continue;
        for (const [qid, entry] of Object.entries(member.positions ?? {})) {
            if (scope.mode === 'candidate' && qid !== scope.subject) continue;
            const subject = subjects.find(one => one.qid === qid);
            if (!subject) continue;
            const {human, position, aiPosition} = readEntry(entry, levels);
            const fillOf = (level) => sideOf(level) === 'yes' ? candidateFill(subject.color_index, strengthOf(level, levels)) : sideFill(sideOf(level), strengthOf(level, levels));
            if (human) {
                const text = `${member.name}: ${labelOf(position)} (${subject.name}), set by ${human.by}`;
                events.push({id: `${member.qid}:${qid}:vote`, at: human.at, kind: 'minor', label: text, title: `${dateOf(human.at)}: ${text}`, fill: fillOf(position), hollow: sideOf(position) === 'unknown', qid: member.qid, text});
            }
            // what the news read, under a vote too
            if (sideOf(aiPosition) !== 'unknown' && entry.since) {
                const text = `${member.name}: ${labelOf(aiPosition)} (${subject.name})${entry.changed ? ', changed' : ''}${human ? ', read from the news' : ''}`;
                events.push({id: `${member.qid}:${qid}`, at: entry.since, kind: entry.changed ? 'key' : 'minor', label: text, title: `${dateOf(entry.since)}: ${text}`, fill: fillOf(aiPosition), weight: entry.media_30d ?? 1, qid: member.qid, text});
            } else if (!human && (entry.uncertain_count ?? 0) > 0 && entry.last_signal_at) {
                const text = `${member.name}: Uncertain signals on ${subject.name}, no position`;
                events.push({id: `${member.qid}:${qid}:u`, at: entry.last_signal_at, kind: 'minor', label: text, title: `${dateOf(entry.last_signal_at)}: ${text}`, fill: candidateFill(subject.color_index), hollow: true, qid: member.qid, text});
            }
        }
    }
    return events;
};
