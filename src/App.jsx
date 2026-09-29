//
//  Author: Fabian Rostello
//  Date: 19.05.2026
//  File: App.jsx
//  Description: Entry point of frontend
//

import {Routes, Route, Navigate} from "react-router-dom";
import {SearchPage} from "@/pages/Search.jsx";
import {LoginPage} from "@/pages/Login.jsx";
import {SignupPage} from "@/pages/Signup.jsx";
import {BriefingPage} from "@/pages/Briefing.jsx";
import {ProfilePage} from "@/pages/Profile.jsx";
import {Toaster} from "@/components/ui/overlay.jsx";
import {useEffect} from "react";
import {jwtDecode} from "jwt-decode";

function App() {
    useEffect(() => {
        const token = localStorage.getItem("JWT");
        if (token) {
            const {exp} = jwtDecode(token);
            if (exp && Date.now() >= exp * 1000) {
                localStorage.removeItem("JWT");
            }
        }
    }, []);

    return (
        <>
            <Routes>
                <Route path="/briefing" element={<BriefingPage/>}/>
                <Route path="/profile" element={<ProfilePage/>}/>
                <Route path="/search" element={<SearchPage/>}/>
                <Route path="/login" element={<LoginPage/>}/>
                <Route path="/register" element={<SignupPage/>}/>
                <Route path="/" element={<Navigate to="/briefing"/>}/>
            </Routes>
            <Toaster/>
        </>
    );
}

export default App
