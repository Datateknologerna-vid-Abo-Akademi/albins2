import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Start.css";
import Albin from "../components/Albin.tsx";
import { clearCategoryCache, fetchCategories, getCachedCategories } from "../services/categoryClient";

const LOGIN_TIMEOUT_MS = 5000;

const Start = () => {
  const navigate = useNavigate();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasAlbinFallen, setHasAlbinFallen] = useState(false);
  const isMountedRef = useRef(true);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getStoredAuth = () => {
    try {
      const raw = window.localStorage.getItem("auth");
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as { token?: unknown; expiry?: unknown };
      if (!parsed || typeof parsed.token !== "string" || parsed.token.length === 0) {
        return null;
      }

      return {
        token: parsed.token,
        expiry: typeof parsed.expiry === "string" ? parsed.expiry : null,
      };
    } catch {
      return null;
    }
  };

  const handleClick = async () => {
    const storedAuth = getStoredAuth();
    const cachedCategories = getCachedCategories();
    const hasCachedCategories = Array.isArray(cachedCategories);
    const hasStoredToken = Boolean(storedAuth?.token);
    hasNavigatedRef.current = false;

    const navigateWithCachedData = () => {
      if (hasNavigatedRef.current || !hasStoredToken || !hasCachedCategories) {
        return false;
      }

      hasNavigatedRef.current = true;
      navigate("/categories");
      return true;
    };

    try {
      setIsAuthenticating(true);
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeoutId =
        controller && typeof window !== "undefined"
          ? window.setTimeout(() => {
              controller.abort();
            }, LOGIN_TIMEOUT_MS)
          : null;

      const requestInit: RequestInit = {
        method: "POST",
        ...(controller ? { signal: controller.signal } : {}),
      };

      let response: Response;
      try {
        response = await fetch("/api/auth/anonymous-login/", requestInit);
      } finally {
        if (timeoutId && typeof window !== "undefined") {
          window.clearTimeout(timeoutId);
        }
      }

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();
      const expiry = data.expiry ? new Date(data.expiry).toISOString() : new Date(Date.now() + 3600 * 1000).toISOString();
      const auth = { token: data.token, expiry };
      window.localStorage.setItem('auth', JSON.stringify(auth));

      if (!hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        navigate("/categories");
      }

      if (typeof navigator !== "undefined" && navigator.onLine) {
        clearCategoryCache();
      }

      try {
        await fetchCategories(auth.token);
      } catch (prefetchErr) {
        console.warn("Prefetching categories failed:", prefetchErr);
      }

    } catch (error) {
      console.error("Login error:", error);
      navigateWithCachedData();
    } finally {
      if (isMountedRef.current) {
        setIsAuthenticating(false);
      }
    }
  };

  return (
      <div className={hasAlbinFallen ? "start-container start-container--fallen" : "start-container"}>
          <Albin onFall={() => setHasAlbinFallen(true)} />
          <button onClick={handleClick} disabled={isAuthenticating}>
              {isAuthenticating ? "Laddar…" : hasAlbinFallen ? "NEEJ! ALBIN!! D:" : "Skål!"}
          </button>
      </div>
  );
};

export default Start;
