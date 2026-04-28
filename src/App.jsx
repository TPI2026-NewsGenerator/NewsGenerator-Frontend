import 'rsuite/dist/rsuite.min.css';
import 'rsuite/TagPicker/styles/index.css';
import './App.css'
import { Routes, Route, Navigate } from "react-router-dom";
import {Fetch} from "./pages/Fetch.jsx";

function App() {

    return (
        <Routes>
            <Route path="/fetch" element={<Fetch />} />
            <Route path="/" element={<Navigate to="/fetch" />} />
        </Routes>
    );
}

export default App
