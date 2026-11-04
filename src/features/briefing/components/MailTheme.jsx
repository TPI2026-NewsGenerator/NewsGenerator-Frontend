//
//  Author: Fabian Rostello
//  Date: 02.11.2026
//  File: MailTheme.jsx
//  Description: The colours of the e-mail, light or dark, chosen by the one who sends it (the user, 02.11.2026):
//               the e-mail keeps them whatever the system of who reads it
//

import {Moon, Sun} from "lucide-react";
import {ToggleGroup} from "radix-ui";

const CHOICES = {
    light: {label: 'Light', Icon: Sun},
    dark: {label: 'Dark', Icon: Moon},
};

// theme: 'light' or 'dark'; onChange(theme)
export const MailTheme = ({theme, onChange, disabled = false}) => (
    <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-4 gap-y-2">
        <p className="kicker">E-mail colours</p>
        {/* one of them always chosen, light at first */}
        <ToggleGroup.Root type="single" value={theme} disabled={disabled} onValueChange={value => value && onChange(value)}
                          aria-label="E-mail colours" className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-paper-deep p-1 [scrollbar-width:none]">
            {Object.keys(CHOICES).map(value => {
                const {label, Icon} = CHOICES[value];
                return (
                    <ToggleGroup.Item key={value} value={value}
                                      className="inline-flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[0.8125rem] text-ink-mute transition-[color,background-color,box-shadow] duration-200 hover:text-ink data-[state=on]:bg-paper data-[state=on]:text-ink data-[state=on]:shadow-[0_1px_3px_rgba(0,0,0,0.12)] disabled:cursor-not-allowed disabled:opacity-50 dark:data-[state=on]:bg-rule">
                        <Icon aria-hidden className="size-3.5" strokeWidth={1.75}/>
                        {label}
                    </ToggleGroup.Item>
                );
            })}
        </ToggleGroup.Root>
    </div>
);
