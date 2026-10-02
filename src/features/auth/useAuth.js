//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: useAuth.js
//  Description: The signed in user of a page, and what to do when their session is refused
//

import {useCallback, useContext} from "react";
import {useNavigate} from "react-router-dom";
import {AuthContext} from "./sessionContext.js";

const EXPIRED = 'Forbidden, invalid or expired';

export const useAuth = () => {
    const navigate = useNavigate();
    const {user, refresh, forget} = useContext(AuthContext);

    // signs out, then shows the login, or stays on the page when `to` is null
    const logout = useCallback(async (to = '/login') => {
        await forget();
        if (to) navigate(to);
    }, [forget, navigate]);

    // true when the answer says the session is no longer valid: the user is sent to the login
    const expired = useCallback((data) => {
        if (typeof data?.error === 'string' && data.error.includes(EXPIRED)) {
            logout();
            return true;
        }
        return false;
    }, [logout]);

    return {user, refresh, logout, expired};
};
