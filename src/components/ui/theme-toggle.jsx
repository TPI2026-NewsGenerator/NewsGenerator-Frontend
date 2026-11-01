//
//  Author: Fabian Rostello
//  Date: 01.11.2026
//  File: theme-toggle.jsx
//  Description: The choice of light or dark: a small button in the bar that goes system, light, dark,
//               and the three choices side by side in the menu of a phone
//

import {Monitor, Moon, Sun} from "lucide-react";
import {ToggleGroup} from "radix-ui";
import {IconButton} from "@/components/ui/button.jsx";
import {setTheme, THEMES, useTheme} from "@/lib/theme.js";
import {cn} from "@/lib/utils.js";

const CHOICES = {
    system: {label: 'Like the system', short: 'System', Icon: Monitor},
    light: {label: 'Light', short: 'Light', Icon: Sun},
    dark: {label: 'Dark', short: 'Dark', Icon: Moon},
};

// one button: it shows the theme read now, a click passes to the next one
export const ThemeButton = ({className}) => {
    const theme = useTheme();
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    const {Icon} = CHOICES[theme];
    return (
        <IconButton label={`Theme: ${CHOICES[theme].label}. Switch to ${CHOICES[next].label.toLowerCase()}`}
                    title={`Theme: ${CHOICES[theme].label}`} className={cn('size-7', className)} onClick={() => setTheme(next)}>
            <Icon aria-hidden className="size-[0.95rem]" strokeWidth={1.75}/>
        </IconButton>
    );
};

// the three side by side, the one read now raised
export const ThemeChoice = ({className}) => {
    const theme = useTheme();
    return (
        <ToggleGroup.Root type="single" value={theme} onValueChange={value => value && setTheme(value)} aria-label="Theme"
                          className={cn('inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-paper-deep p-1 [scrollbar-width:none]', className)}>
            {THEMES.map(value => {
                const {short, Icon} = CHOICES[value];
                return (
                    <ToggleGroup.Item key={value} value={value}
                                      className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[0.875rem] text-ink-mute transition-[color,background-color,box-shadow] duration-200 hover:text-ink data-[state=on]:bg-paper data-[state=on]:text-ink data-[state=on]:shadow-[0_1px_3px_rgba(0,0,0,0.12)] dark:data-[state=on]:bg-rule">
                        <Icon aria-hidden className="size-4" strokeWidth={1.75}/>
                        {short}
                    </ToggleGroup.Item>
                );
            })}
        </ToggleGroup.Root>
    );
};
