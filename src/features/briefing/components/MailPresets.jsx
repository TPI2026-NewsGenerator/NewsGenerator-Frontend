//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: MailPresets.jsx
//  Description: What each preset puts in a story, in the settings: the blocks in rows, the presets in columns, a box ticked where the preset puts
//               it (the user, 05.11.2026), that the reader ticks and unticks to set what each preset contains (the user, 06.11.2026). Two
//               tables, one for the editor of the e-mail and one for the page of the briefing, each preset with its own blocks in each. What is
//               at first is in mailBlocks.js, what the reader sets is kept on the account (see blockPresets.js)
//

import {Check} from "lucide-react";
import {Button} from "@/components/ui/button.jsx";
import {Checkbox} from "@/components/ui/field.jsx";
import {BLOCKS} from "@/features/briefing/mailBlocks.js";
import {usePresets} from "@/features/briefing/blockPresets.js";

// in every preset, whatever it is: the title and the text of the story, that the reader does not set
const Included = () => <Check role="img" aria-label="Included" className="mx-auto size-4 text-action-text" strokeWidth={2.5}/>;

// scope: 'mail' or 'page'; label: the name of the table; what: where the blocks are put, for the words of the note ("in the e-mail")
const BlockPresets = ({scope, label, what}) => {
    const {presets, set, reset} = usePresets(scope);
    const changed = presets.filter(preset => preset.changed);

    return (
        <div className="max-w-[46rem]">
            <table aria-label={label} className="w-full border-collapse text-[0.9375rem]">
                <thead>
                    <tr className="border-b border-rule">
                        <th scope="col" className="py-2 pr-4 text-left caption font-normal">Block</th>
                        {presets.map(preset => <th key={preset.value} scope="col" className="px-2 py-2 text-center text-[0.8125rem] font-medium">{preset.label}</th>)}
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b border-rule">
                        <th scope="row" className="py-2 pr-4 text-left font-normal">Title and text</th>
                        {presets.map(preset => <td key={preset.value} className="px-2 py-2 text-center"><Included/></td>)}
                    </tr>
                    {BLOCKS.map(block => (
                        <tr key={block.key} className="border-b border-rule last:border-b-0">
                            <th scope="row" className="py-1 pr-4 text-left font-normal">
                                {block.label}{block.badge && <span className="caption"> · badge</span>}
                            </th>
                            {presets.map(preset => (
                                <td key={preset.value} className="px-2 py-1 text-center">
                                    <Checkbox checked={preset.on.includes(block.key)} className="justify-center py-0.5"
                                              onChange={event => set(preset.value, block.key, event.target.checked)}>
                                        <span className="sr-only">{block.label} in “{preset.label}”</span>
                                    </Checkbox>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="caption mt-3">
                Tick what each preset puts {what}. A preset puts a block in the stories that have it only: no “Contested” badge for a story nobody
                denies. The title and the text are always there. Kept on your account.
            </p>
            {changed.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {changed.map(preset => (
                        <Button key={preset.value} size="sm" variant="link" onClick={() => reset(preset.value)}>Put “{preset.label}” back as it was</Button>
                    ))}
                </div>
            )}
        </div>
    );
};

// what the presets of the editor of the e-mail put in it
export const MailPresets = () => (
    <BlockPresets scope="mail" label="What the presets put in the e-mail" what="in each story of the e-mail"/>
);

// what the presets of the page of the briefing show on its cards
export const PagePresets = () => (
    <BlockPresets scope="page" label="What the presets show on the page" what="on each card of the page"/>
);
