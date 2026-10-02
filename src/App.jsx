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
import {SettingsPage} from "@/pages/Settings.jsx";
import {Toaster} from "@/components/ui/overlay.jsx";

function App() {
    return (
        <>
            <Routes>
                <Route path="/briefing" element={<BriefingPage/>}/>
                <Route path="/profile" element={<ProfilePage/>}/>
                <Route path="/search" element={<SearchPage/>}/>
                <Route path="/settings" element={<SettingsPage/>}/>
                <Route path="/login" element={<LoginPage/>}/>
                <Route path="/register" element={<SignupPage/>}/>
                <Route path="/" element={<Navigate to="/briefing"/>}/>
            </Routes>
            <Toaster/>
        </>
    );
}

export default App
