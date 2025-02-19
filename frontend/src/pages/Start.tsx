import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Start.css";
import Albin from "../components/Albin.tsx";

const Start = () => {
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleClick = async () => {
    try {
      const response = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: 'test', password: '5d!6F8BJtK$GRNypjs&g' }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();
      setToken(data.token);
      const auth = { token: data.token, expiry: new Date(Date.now() + 3600 * 1000).toISOString() };
      window.localStorage.setItem('auth', JSON.stringify(auth));

      // Redirect to categories page
      navigate("/categories");
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
      <div className="start-container">
          <Albin />
          <button onClick={handleClick}>Skål!</button>
      </div>
  );
};

export default Start;
