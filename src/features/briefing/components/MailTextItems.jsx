//
//  Author: Fabian Rostello
//  Date: 06.11.2026
//  File: MailTextItems.jsx
//  Description: The sentences the e-mail sends of a story, one box for each: a bullet point (a bullet before it), a key passage or a
//               paragraph of the summary (the […] the e-mail puts between two, between them). One box a point was one text with a
//               line a point and no bullet, and the end of a point could not be told from the next (the user, 06.11.2026)
//

import {useEffect, useLayoutEffect, useRef} from "react";
import {Plus, X} from "lucide-react";
import {Button} from "@/components/ui/button.jsx";
import {cn} from "@/lib/utils.js";

// The text as the draft keeps it (see useMailDraft): the points a line each, the passages and the paragraphs of the summary a blank line
// between two. Cut in the pieces it is made of, an empty one kept: the box the reader has just added
const cut = (text, way) => String(text ?? '').split(way === 'points' ? '\n' : '\n\n');
const join = (items, way) => items.join(way === 'points' ? '\n' : '\n\n');
// What a box was given, cut again: several lines pasted in a point are several points, several paragraphs pasted in a passage several
// passages, and the lines of a passage one text
const piecesOf = (text, way) => way === 'points'
    ? text.split(/\n+/)
    : text.split(/\n\s*\n/).map(piece => piece.replace(/\s*\n\s*/g, ' '));

const NOUNS = {points: 'Point', digest: 'Passage', passages: 'Passage'};

// value: the text; way: 'points', 'digest' or 'passages'; label: what it is called ("Its bullet points in the e-mail"); onChange(text): the
// text as the draft keeps it; describedBy: the id of the note under it
export const MailTextItems = ({id, way, label, value, onChange, describedBy, disabled = false}) => {
    const points = way === 'points';
    const noun = NOUNS[way] ?? 'Passage';
    const items = cut(value, way);
    const fields = useRef([]);
    // the box to put the cursor in once the text is drawn again: the one just added
    const focusAt = useRef(null);

    useLayoutEffect(() => {
        // each box as high as its text: no scroll inside a point
        for (const node of fields.current) {
            if (node && node.scrollHeight > 0) {
                node.style.height = 'auto';
                node.style.height = `${node.scrollHeight}px`;
            }
        }
    });
    useEffect(() => {
        if (focusAt.current === null) return;
        fields.current[focusAt.current]?.focus();
        focusAt.current = null;
    });

    const set = (next) => onChange(join(next, way));
    const replace = (at, text) => {
        const parts = piecesOf(text, way);
        set([...items.slice(0, at), ...parts, ...items.slice(at + 1)]);
        if (parts.length > 1) focusAt.current = at + parts.length - 1;
    };
    const add = (after) => {
        set([...items.slice(0, after + 1), '', ...items.slice(after + 1)]);
        focusAt.current = after + 1;
    };
    const remove = (at) => {
        const next = items.filter((_, index) => index !== at);
        set(next.length > 0 ? next : ['']);
        focusAt.current = Math.max(0, at - 1);
    };

    return (
        <div role="group" aria-labelledby={`mail-text-label-${id}`} aria-describedby={describedBy}>
            <p id={`mail-text-label-${id}`} className="text-[0.875rem] font-medium text-ink">{label}</p>
            <ol className="mt-1.5 list-none p-0">
                {items.map((item, at) => (
                    <li key={at}>
                        {/* what the e-mail puts between two passages */}
                        {!points && at > 0 && <p aria-hidden className="py-1 text-center text-[0.8125rem] leading-none tracking-widest text-ink-mute">[…]</p>}
                        <div className={cn('flex items-start gap-2', points && at > 0 && 'mt-1.5')}>
                            {points && <span aria-hidden className="mt-[0.55rem] w-3 shrink-0 text-center text-[1rem] leading-none text-ink-mute">•</span>}
                            <textarea ref={node => { fields.current[at] = node; }} rows={1} value={item} disabled={disabled}
                                      aria-label={`${noun} ${at + 1}`}
                                      className={cn('block min-w-0 flex-1 resize-none overflow-hidden rounded-xl border border-rule bg-paper px-3 py-2 text-[0.8125rem] leading-snug text-ink outline-none',
                                          'transition-[border-color,box-shadow] duration-200 focus:border-action focus:ring-4 focus:ring-action/15 disabled:opacity-50')}
                                      onChange={event => replace(at, event.target.value)}
                                      onKeyDown={event => {
                                          if (event.nativeEvent.isComposing) return;
                                          if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
                                              // Enter ends it: the next one begins
                                              event.preventDefault();
                                              add(at);
                                          } else if (event.key === 'Backspace' && item === '' && items.length > 1) {
                                              event.preventDefault();
                                              remove(at);
                                          }
                                      }}/>
                            {(items.length > 1 || item !== '') && (
                                <button type="button" disabled={disabled} onClick={() => remove(at)} aria-label={`Remove ${noun.toLowerCase()} ${at + 1}`} title={`Remove this ${noun.toLowerCase()}`}
                                        className="mt-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-mute transition-colors hover:bg-paper-deep hover:text-ink disabled:cursor-not-allowed disabled:opacity-50">
                                    <X aria-hidden className="size-4"/>
                                </button>
                            )}
                        </div>
                    </li>
                ))}
            </ol>
            <Button size="sm" variant="link" className="mt-1" disabled={disabled} onClick={() => add(items.length - 1)}>
                <Plus aria-hidden className="size-3.5"/>
                Add a {noun.toLowerCase()}
            </Button>
        </div>
    );
};
