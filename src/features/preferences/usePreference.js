//
//  Author: Fabian Rostello
//  Date: 06.11.2026
//  File: usePreference.js
//  Description: A preference of the reader in a component: the value of this browser at once, then the one of the account once it has
//               been read; the component draws again when it changes, whoever changed it (see preferences.js)
//

import {useMemo, useSyncExternalStore} from "react";
import {subscribe} from "@/features/preferences/preferences.js";

// definition: a preference (see preferences.js). -> [value, set(value)], the value being the one at first until the reader chooses
export const usePreference = (definition) => {
    const text = useSyncExternalStore(subscribe, definition.text);
    const value = useMemo(() => definition.parse(text) ?? definition.fallback, [definition, text]);
    return [value, definition.keep];
};
