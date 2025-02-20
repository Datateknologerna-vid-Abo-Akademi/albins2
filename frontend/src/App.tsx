import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Start from './pages/Start.tsx';
import Categories from './pages/Categories.tsx';
import Songs from './pages/Songs.tsx';
import Search from './pages/Search.tsx';
import './App.css';
import {useEffect} from "react";
import Song from "./pages/Song.tsx";

const App = () => {
    useEffect(() => {
        const auth = JSON.parse(localStorage.getItem("auth") ?? "{}");

        if (!auth?.token || !auth?.expiry || new Date(auth.expiry) < new Date()) {
            console.log("No valid authentication found");
        }
    }, []);

    return (
        <Router>
            <Routes>
                <Route path="/" element={<Start />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/songs" element={<Songs />} />
                <Route path="/search" element={<Search />} />
                <Route path="/song/:id" element={<Song />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
};

export default App;
