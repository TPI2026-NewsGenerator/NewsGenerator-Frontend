//
//  Author: Fabian Rostello
//  Date: 02.10.2026
//  File: AuthContext.jsx
//  Description: The signed in reader, asked to the server once when the app opens: the session is in
//               a cookie the page cannot read (see server/services/utils/jwt.js)
//

import {useCallback, useEffect, useState} from "react";
import {AuthContext} from "./sessionContext.js";
import {forgetSearch} from "@/features/search/keptSearch.js";
import {setActiveProfile} from "@/features/profiles/activeProfile.js";
import {endPreferences, startPreferences} from "@/features/preferences/preferences.js";
// every preference is known before the account is asked for them
import "@/features/preferences/registered.js";

const API_URL = import.meta.env.VITE_API_URL;

// the reader of the session, null when nobody is signed in
const fetchSession = async () => {
    const response = await fetch(`${API_URL}/session`).catch(() => null);
    return response?.ok ? await response.json() : null;
};

export const AuthProvider = ({children}) => {
    // undefined until the server answered: the pages are shown once it is known who reads them
    const [user, setUser] = useState(undefined);

    useEffect(() => {
        // the token kept before the cookie, readable by any script of the page: it goes
        localStorage.removeItem('JWT');
        fetchSession().then(setUser);
    }, []);

    // the display preferences of the account are read once the reader is known (see features/preferences)
    const reader = user?.id;
    useEffect(() => {
        if (reader !== undefined) startPreferences(reader);
    }, [reader]);

    // after the login or the signup set the cookie
    const refresh = useCallback(async () => {
        const reader = await fetchSession();
        setUser(reader);
        return reader;
    }, []);

    // the cookie removed by the server, or already refused by it
    const forget = useCallback(async () => {
        setUser(null);
        forgetSearch();
        // the next reader of this browser has profiles of their own
        setActiveProfile(null);
        // what waits to go up to the account goes while the session lasts; the preferences stay in the browser, which knows whose they are
        await endPreferences();
        await fetch(`${API_URL}/session`, {method: 'DELETE'}).catch(() => null);
    }, []);

    if (user === undefined) return null;
    return <AuthContext.Provider value={{user, refresh, forget}}>{children}</AuthContext.Provider>;
};
