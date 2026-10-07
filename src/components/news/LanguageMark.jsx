//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: LanguageMark.jsx
//  Description: The language a source writes in, next to its name: an icon and its code, its name in
//               full when pointed at
//

import {Languages} from "lucide-react";
import {languageLabel} from "@/features/briefing/profileWords.js";
import {cn} from "@/lib/utils.js";

// code: 'fr', 'en', 'hu'... nothing when it is not known
export const LanguageMark = ({code, className}) => {
    if (!code) return null;
    const name = languageLabel(code);
    return (
        <span title={`Written in ${name}`} aria-label={`written in ${name}`}
              className={cn('ml-1 inline-flex items-center gap-0.5 border border-rule px-1 align-[0.08em] font-mono text-[0.6875rem] leading-[1.35] font-medium tracking-[0.04em] text-ink-mute uppercase', className)}>
            <Languages aria-hidden className="size-2.5"/>
            {code}
        </span>
    );
};
