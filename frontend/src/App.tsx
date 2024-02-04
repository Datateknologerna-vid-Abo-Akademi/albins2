import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Start from './pages/Start.tsx';
import Main from './pages/Main.tsx';
import './App.css';

const App = () => {
    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/" element={<Start />} />
                    <Route path="/songs" element={<Main />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;