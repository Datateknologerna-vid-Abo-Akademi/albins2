import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Footer from "../components/Footer";
import SongList from "../components/SongList";
import "../styles/Songs.css";
import { CategoryWithSongs, SongSummary, fetchCategories, getCachedCategories } from "../services/categoryClient";

const Songs = () => {
    const [songs, setSongs] = useState<SongSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const category = searchParams.get("category");

    useEffect(() => {
        if (!category) {
            setSongs([]);
            setError(null);
            setIsLoading(false);
            return;
        }

        const auth = JSON.parse(localStorage.getItem("auth") ?? "{}");

        if (!auth?.token) {
            console.error("No authentication token found");
            navigate("/");
            return;
        }

        let cancelled = false;

        const applySongs = (categoriesData: CategoryWithSongs[]) => {
            if (cancelled) return;
            const match = categoriesData.find((item) => item.name === category);
            if (match && match.songs?.length) {
                setSongs([...match.songs]);
                setError(null);
            } else {
                setSongs([]);
                setError(null);
            }
        };

        const cached = getCachedCategories();
        if (cached) {
            applySongs(cached);
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }

        if (!cached) {
            (async () => {
                try {
                    const data = await fetchCategories(auth.token);
                    applySongs(data);
                    if (!cancelled) {
                        setIsLoading(false);
                    }
                } catch (err) {
                    if (cancelled) return;
                    console.error("Fetching songs failed:", err);
                    if (!cached) {
                        setError("Failed to load songs.");
                    }
                    setIsLoading(false);
                }
            })();
        }

        return () => {
            cancelled = true;
        };
    }, [category, navigate]);

    return (
        <div className="page-shell songs-container">
            <h1 className="page-heading">{category}</h1>
            <SongList
                songs={songs}
                isLoading={isLoading}
                error={error}
                onSelectSong={(songId) => navigate(`/song/${songId}`)}
            />
            <Footer />
        </div>
    );
};

export default Songs;
