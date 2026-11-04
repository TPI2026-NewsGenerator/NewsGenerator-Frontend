//
//  Author: Fabian Rostello
//  Date: 05.11.2026
//  File: MailPresets.jsx
//  Description: What each preset of the editor of the e-mail puts in a story (the user, 05.11.2026), in the settings: the blocks in rows, the
//               presets in columns, a mark where the preset puts it. Made from the presets themselves (see mailBlocks.js), so what it says
//               is what they do
//

import {Check} from "lucide-react";
import {BLOCKS, PRESETS} from "@/features/briefing/mailBlocks.js";

const Included = () => <Check role="img" aria-label="Included" className="mx-auto size-4 text-action-text" strokeWidth={2.5}/>;
const Not = () => <span role="img" aria-label="Not included" className="text-ink-mute/60">–</span>;

export const MailPresets = () => (
    <div className="max-w-[46rem]">
        <table aria-label="What the presets put in the e-mail" className="w-full border-collapse text-[0.9375rem]">
            <thead>
                <tr className="border-b border-rule">
                    <th scope="col" className="py-2 pr-4 text-left caption font-normal">Block</th>
                    {PRESETS.map(preset => <th key={preset.value} scope="col" className="px-2 py-2 text-center text-[0.8125rem] font-medium">{preset.label}</th>)}
                </tr>
            </thead>
            <tbody>
                {/* in every preset, whatever it is: the title and the text of the story */}
                <tr className="border-b border-rule">
                    <th scope="row" className="py-2 pr-4 text-left font-normal">Title and text</th>
                    {PRESETS.map(preset => <td key={preset.value} className="px-2 py-2 text-center"><Included/></td>)}
                </tr>
                {BLOCKS.map(block => (
                    <tr key={block.key} className="border-b border-rule last:border-b-0">
                        <th scope="row" className="py-2 pr-4 text-left font-normal">
                            {block.label}{block.badge && <span className="caption"> · badge</span>}
                        </th>
                        {PRESETS.map(preset => (
                            <td key={preset.value} className="px-2 py-2 text-center">{preset.on.includes(block.key) ? <Included/> : <Not/>}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
        <p className="caption mt-3">
            A preset puts a block in the stories that have it only: no “Contested” badge for a story nobody denies. The title and the text are always
            there, and each story can be changed after it.
        </p>
    </div>
);
