//
//  Author: Fabian Rostello
//  Date: 06.11.2026
//  File: switch.jsx
//  Description: A switch: a thing put on or off at once, with its words beside it (the Radix switch, in the colours of the page). A
//               checkbox is for what is sent with a form, a switch for what changes what is seen
//

import {Switch as SwitchPrimitive} from "radix-ui";
import {cn} from "@/lib/utils.js";

// checked, onCheckedChange(checked): as the Radix switch; children: its words, which are its name for the screen readers
export const Switch = ({className, children, ...props}) => (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5 text-[0.875rem] leading-none text-ink select-none', className)}>
        <SwitchPrimitive.Root
            className={cn('relative inline-flex h-[1.375rem] w-[2.375rem] shrink-0 cursor-pointer items-center rounded-full bg-ink-mute/35 transition-colors duration-200',
                'data-[state=checked]:bg-action hover:bg-ink-mute/50 data-[state=checked]:hover:bg-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action',
                'disabled:cursor-not-allowed disabled:opacity-50')}
            {...props}>
            <SwitchPrimitive.Thumb className="pointer-events-none block size-[1.125rem] translate-x-0.5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200 data-[state=checked]:translate-x-[1.125rem]"/>
        </SwitchPrimitive.Root>
        {children}
    </label>
);
