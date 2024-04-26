import Start from './pages/Start.tsx';
import Main from './pages/Main.tsx';
import './App.css';
import {useEffect, useState} from "react";

const App = () => {
    const [showMain, setShowMain] = useState(false);

    useEffect(() => {
        const auth = JSON.parse(window.localStorage.getItem("auth") ?? "{}");

        if (!auth || !auth.expiry) {
            console.log("No token found");
            setShowMain(false);
        }
        else if (auth.expiry < new Date().toISOString()) {
            console.log("Token expired");
            setShowMain(false);
        }
        else {
            setShowMain(true);
        }
    }, []);

    return (
        <>
            {!showMain ? <Start/> : <Main onBackClick={() => setShowMain(false)} />}
        </>
    );
}

export default App;