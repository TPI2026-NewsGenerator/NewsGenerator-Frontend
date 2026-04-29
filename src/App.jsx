import 'rsuite/dist/rsuite.min.css';
import 'rsuite/TagPicker/styles/index.css';
import './App.css'
import { Routes, Route, Navigate } from "react-router-dom";
import {FetchPage} from "@/pages/Fetch.jsx";
import {LoginPage} from "@/pages/Login.jsx";

function App() {

    return (
        <Routes>
            <Route path="/fetch" element={<FetchPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/fetch" />} />
        </Routes>
    );
}

export default App
