import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Start.css";
import Albin from "../components/Albin.tsx";
import { clearCategoryCache, fetchCategories } from "../services/categoryClient";

const Start = () => {
  const navigate = useNavigate();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasAlbinFallen, setHasAlbinFallen] = useState(false);

  const handleClick = async () => {
    try {
      setIsAuthenticating(true);
      const response = await fetch('/api/auth/anonymous-login/', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();
      const expiry = data.expiry ? new Date(data.expiry).toISOString() : new Date(Date.now() + 3600 * 1000).toISOString();
      const auth = { token: data.token, expiry };
      window.localStorage.setItem('auth', JSON.stringify(auth));
      clearCategoryCache();
      try {
        await fetchCategories(auth.token);
      } catch (prefetchErr) {
        console.warn("Prefetching categories failed:", prefetchErr);
      }

      // Redirect to categories page
      navigate("/categories");
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
      <div className={hasAlbinFallen ? "start-container start-container--fallen" : "start-container"}>
          <Albin onFall={() => setHasAlbinFallen(true)} />
          <button onClick={handleClick} disabled={isAuthenticating}>
              {isAuthenticating ? "Laddar…" : hasAlbinFallen ? "NEEJ! ALBIN!!" : "Skål!"}
          </button>
      </div>
  );
};

export default Start;
