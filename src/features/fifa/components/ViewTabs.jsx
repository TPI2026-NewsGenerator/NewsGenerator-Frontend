//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: ViewTabs.jsx
//  Description: The six views of the page "The FIFA presidency" as tabs in a pill (the way of the tabs of the briefing): Map, Map & list,
//               List, Timeline, Confederations, Presidents. The view is in the address, so a link opens on it
//

import {Tabs} from "radix-ui";
import {VIEWS} from "@/features/fifa/useFifaState.js";

// the tab of a pill, as the one of the page of the briefing
const TAB = 'inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[0.8125rem] text-ink-mute transition-[color,background-color,box-shadow] duration-200 hover:text-ink data-[state=active]:bg-paper data-[state=active]:text-ink data-[state=active]:shadow-[0_1px_3px_rgba(0,0,0,0.12)] dark:data-[state=active]:bg-rule';

// the list of tabs only: the page puts the panel of the view read under it (the views share one Tabs.Root, see Fifa.jsx)
export const ViewTabs = () => (
    <Tabs.List aria-label="Views of the FIFA presidency" className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-paper-deep p-1 [scrollbar-width:none]">
        {VIEWS.map(view => <Tabs.Trigger key={view.value} value={view.value} className={TAB}>{view.label}</Tabs.Trigger>)}
    </Tabs.List>
);
