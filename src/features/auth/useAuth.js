//
//  Author: Fabian Rostello
//  Date: 24.09.2026
//  File: useAuth.js
//  Description: The signed in user of a page, and what to do when their token is refused
//

import {useCallback, useState} from "react";
import {useNavigate} from "react-router-dom";
import {jwtDecode} from "jwt-decode";

const EXPIRED = 'Forbidden, invalid or expired';

export const useAuth = () => {
    const navigate = useNavigate();
    const [token] = useState(() => localStorage.getItem("JWT"));
    const [user] = useState(() => {
        try {
            return token ? jwtDecode(token) : null;
        } catch {
            return null;
        }
    });

    const logout = useCallback(() => {
        localStorage.removeItem("JWT");
        navigate('/login');
    }, [navigate]);

    // true when the answer says the token is no longer valid: the user is sent to the login
    const expired = useCallback((data) => {
        if (typeof data?.error === 'string' && data.error.includes(EXPIRED)) {
            logout();
            return true;
        }
        return false;
    }, [logout]);

    return {token, user, logout, expired};
};
