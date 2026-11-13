//
//  Author: Fabian Rostello
//  Date: 19.05.2026
//  File: App.jsx
//  Description: Entry point of frontend
//

import {lazy, Suspense} from "react";
import {Routes, Route, Navigate} from "react-router-dom";
import {SearchPage} from "@/pages/Search.jsx";
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

// the page of the map loads d3 and its base map only when it is opened
const FifaPage = lazy(() => import("@/pages/Fifa.jsx").then(module => ({default: module.FifaPage})));

function App() {
    return (
        <>
            <Routes>
                <Route path="/briefing" element={<BriefingPage/>}/>
                <Route path="/affairs" element={<AffairsPage/>}/>
                <Route path="/fifa" element={<Suspense fallback={null}><FifaPage/></Suspense>}/>
                <Route path="/affairs/:id" element={<AffairDetailPage/>}/>
                <Route path="/profile" element={<ProfilePage/>}/>
                <Route path="/search" element={<SearchPage/>}/>
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
