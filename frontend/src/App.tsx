import Start from './pages/Start.tsx';
import Main from './pages/Main.tsx';
import './App.css';
import {useState} from "react";

const App = () => {
    const [showMain, setShowMain] = useState(false);
    return (
        <>
            {!showMain ? <Start onButtonClick={() => setShowMain(true)} /> : <Main onBackClick={() => setShowMain(false)} />}
        </>
    );
}

export default App;