import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Start from './pages/Start.tsx';
import Categories from './pages/Categories.tsx';
import Main from './pages/Main.tsx';
import './App.css';
import { useEffect, useState } from "react";

const App = () => {
    const [showMain, setShowMain] = useState(false);

    useEffect(() => {
        const auth = JSON.parse(window.localStorage.getItem("auth") ?? "{}");

        if (!auth || !auth.token || !auth.expiry) {
            console.log("No valid authentication found");
            setShowMain(false);
        } else if (new Date(auth.expiry) < new Date()) {
            console.log("Token expired");
            window.localStorage.removeItem("auth");
            setShowMain(false);
        } else {
            setShowMain(true);
        }
    }, []);

    return (
        <Router>
            <Routes>
                <Route path="/" element={<Start />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/songs" element={<Main />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
};

export default App;
