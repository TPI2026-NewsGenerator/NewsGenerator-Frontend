//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: BlockLists.jsx
//  Description: What a story carries, in the settings: the blocks in rows, a box ticked where the story has it (the user, 05.11.2026), one list for the
//               editor of the e-mail and one for the page of the briefing (the user, 10.11.2026: the three presets "Short", "Standard" and "Everything"
//               are gone, one mode is enough). The editor opens with the first, the cards of the page show the second. What is at first is in
//               blockPresets.js, what the reader sets is kept on the account
//

import {Check} from "lucide-react";
import {Button} from "@/components/ui/button.jsx";
import {Checkbox} from "@/components/ui/field.jsx";
import {BLOCKS} from "@/features/briefing/mailBlocks.js";
import {useBlocks} from "@/features/briefing/blockPresets.js";

// whatever the list: the title and the text of the story, that the reader does not set
const Included = () => <Check role="img" aria-label="Included" className="mx-auto size-4 text-action-text" strokeWidth={2.5}/>;

// scope: 'mail' or 'page'; label: the name of the table; what: where the blocks are put, for the words of the note ("in the e-mail")
const BlockList = ({scope, label, what, column}) => {
    const {isOn, set, reset, changed} = useBlocks(scope);

    return (
        <div className="max-w-[32rem]">
            <table aria-label={label} className="w-full border-collapse text-[0.9375rem]">
                <thead>
                    <tr className="border-b border-rule">
                        <th scope="col" className="py-2 pr-4 text-left caption font-normal">Block</th>
                        <th scope="col" className="w-28 px-2 py-2 text-center text-[0.8125rem] font-medium">{column}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b border-rule">
                        <th scope="row" className="py-2 pr-4 text-left font-normal">Title and text</th>
                        <td className="px-2 py-2 text-center"><Included/></td>
                    </tr>
                    {BLOCKS.map(block => (
                        <tr key={block.key} className="border-b border-rule last:border-b-0">
                            <th scope="row" className="py-1 pr-4 text-left font-normal">
                                {block.label}{block.badge && <span className="caption"> · badge</span>}
                            </th>
                            <td className="px-2 py-1 text-center">
                                <Checkbox checked={isOn(block.key)} className="justify-center py-0.5" onChange={event => set(block.key, event.target.checked)}>
                                    <span className="sr-only">{block.label} {what}</span>
                                </Checkbox>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="caption mt-3">
                Tick what a story carries {what}. A block is put in the stories that have it only: no “Contested” badge for a story nobody
                denies. The title and the text are always there. Kept on your account.
            </p>
            {changed && (
                <div className="mt-2">
                    <Button size="sm" variant="link" onClick={reset}>Put it back as it was at first</Button>
                </div>
            )}
        </div>
    );
};

// what the editor of the e-mail opens with: the blocks of each story of the e-mail
export const MailBlocks = () => (
    <BlockList scope="mail" label="What a story carries in the e-mail" what="in the e-mail" column="In the e-mail"/>
);

// what the cards of the page of the briefing show
export const PageBlocks = () => (
    <BlockList scope="page" label="What a story carries on the page" what="on the page" column="On the page"/>
);
