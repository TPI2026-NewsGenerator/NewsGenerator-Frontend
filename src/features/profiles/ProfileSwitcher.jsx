//
//  Author: Fabian Rostello
//  Date: 08.10.2026
//  File: ProfileSwitcher.jsx
//  Description: The profile the reader reads now, chosen among theirs in the masthead, and the way to
//               write another one
//

import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {DropdownMenu} from "radix-ui";
import {ChevronDown} from "lucide-react";
import {ProfileApi} from "@/features/briefing/api/briefingApi.js";
import {onProfilesChanged, setActiveProfile, useActiveProfile} from "@/features/profiles/activeProfile.js";
import {cn} from "@/lib/utils.js";

const itemClass = 'flex cursor-pointer items-center gap-2 px-3 py-2 text-[0.9375rem] text-ink outline-none data-[highlighted]:bg-paper-deep';

// onChoose: called once a profile is chosen (the mobile menu closes). className: of the trigger.
// admin: may write other profiles (see server/services/utils/admin.js); a reader with one profile
// who may not is only told which one they read
export const ProfileSwitcher = ({onChoose, className, admin = false}) => {
    const active = useActiveProfile();
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState([]);

    useEffect(() => {
        // no list (the server unreachable, a call that failed): no switcher, the page still works
        const load = () => Promise.resolve().then(() => ProfileApi.list())
            .then(data => setProfiles(Array.isArray(data?.profiles) ? data.profiles : []))
            .catch(() => setProfiles([]));
        load();
        return onProfilesChanged(load);
    }, []);

    // a profile kept in the browser that is no longer one of the reader's: the first one is read
    useEffect(() => {
        if (active !== null && profiles.length > 0 && !profiles.some(profile => profile.id === active)) setActiveProfile(null);
    }, [active, profiles]);

    // a reader who may have one profile only reads no name of a profile
    if (profiles.length === 0 || (!admin && profiles.length === 1)) return null;
    const current = profiles.find(profile => profile.id === active) ?? profiles[0];

    const choose = (id) => {
        setActiveProfile(Number(id));
        onChoose?.();
    };

    return (
        <DropdownMenu.Root>
            {/* said a profile, not only its name: next to the name of the reader it read as a second name */}
            <DropdownMenu.Trigger
                className={cn('inline-flex min-w-0 max-w-[14rem] cursor-pointer items-baseline gap-1.5 text-[0.9375rem] font-semibold tracking-[0.08em] text-ink [font-variant-caps:all-small-caps] hover:text-accent-ink', className)}
                aria-label={`Profile read: ${current.name}. Choose another`}>
                <span className="folio shrink-0 font-normal">Profile</span>
                <span className="truncate">{current.name}</span>
                <ChevronDown aria-hidden className="size-3.5 shrink-0 self-center"/>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={8}
                                      className="z-50 min-w-[13rem] border border-ink bg-paper py-1 shadow-[4px_4px_0_var(--color-rule)]">
                    <DropdownMenu.Label className="kicker px-3 pt-2 pb-1">Your profiles</DropdownMenu.Label>
                    <DropdownMenu.RadioGroup value={String(current.id)} onValueChange={choose}>
                        {profiles.map(profile => (
                            <DropdownMenu.RadioItem key={profile.id} value={String(profile.id)} className={itemClass}>
                                <span aria-hidden className={cn('size-1.5 rounded-full', profile.id === current.id ? 'bg-accent-ink' : 'bg-transparent')}/>
                                <span className="truncate">{profile.name}</span>
                            </DropdownMenu.RadioItem>
                        ))}
                    </DropdownMenu.RadioGroup>
                    {admin && (
                        <>
                            <DropdownMenu.Separator className="my-1 h-px bg-rule"/>
                            <DropdownMenu.Item className={itemClass} onSelect={() => { onChoose?.(); navigate('/profile?new=1'); }}>
                                New profile…
                            </DropdownMenu.Item>
                        </>
                    )}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
};
