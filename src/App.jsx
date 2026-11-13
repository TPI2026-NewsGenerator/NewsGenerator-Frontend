//
//  Author: Fabian Rostello
//  Date: 19.05.2026
//  File: App.jsx
//  Description: Entry point of frontend
//

import {Routes, Route, Navigate} from "react-router-dom";
import {LoginPage} from "@/pages/Login.jsx";
import {SignupPage} from "@/pages/Signup.jsx";
import {BriefingPage} from "@/pages/Briefing.jsx";
import {ProfilePage} from "@/pages/Profile.jsx";
import {SettingsPage} from "@/pages/Settings.jsx";
import {FollowingPage} from "@/pages/Following.jsx";
import {EntityPage} from "@/pages/Entity.jsx";
import {AffairsPage} from "@/pages/Affairs.jsx";
import {AffairDetailPage} from "@/pages/AffairDetail.jsx";
import {NamePage} from "@/pages/Name.jsx";
import {Toaster} from "@/components/ui/overlay.jsx";

// The pages Search (pages/Search.jsx) and FIFA (pages/Fifa.jsx, lazy: it loads d3 and its base map only when opened) are CLOSED (the user, 13.11.2026): no route and no
// link opens them, the old addresses go to the briefing. Their code is kept: to open one again, add its route here (the FIFA one inside a Suspense) and its entry in
// SECTIONS of features/navbar/components/Masthead.jsx
function App() {
    return (
        <>
            <Routes>
                <Route path="/briefing" element={<BriefingPage/>}/>
                <Route path="/affairs" element={<AffairsPage/>}/>
                <Route path="/affairs/:id" element={<AffairDetailPage/>}/>
                <Route path="/profile" element={<ProfilePage/>}/>
                <Route path="/search" element={<Navigate to="/briefing" replace/>}/>
                <Route path="/fifa" element={<Navigate to="/briefing" replace/>}/>
                <Route path="/following" element={<FollowingPage/>}/>
                <Route path="/following/:qid" element={<EntityPage/>}/>
                <Route path="/following/name/:name" element={<NamePage/>}/>
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
