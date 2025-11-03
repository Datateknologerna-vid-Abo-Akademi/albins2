import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Footer from "../components/Footer";
import "../styles/song.css";
import { CategoryWithSongs, fetchCategories, getCachedCategories } from "../services/categoryClient";

interface SongDetail {
    id: number;
    title: string;
    author: string | null;
    melody: string | null;
    content: string | null;
    categoryId: number | null;
    categoryName: string;
    page_number: number | null;
    negative_page_number: number | null;
}

const hydrateSong = (songId: number, categories: CategoryWithSongs[] | null): SongDetail | null => {
    if (!categories) return null;
    for (const category of categories) {
        const match = category.songs?.find((song) => song.id === songId);
        if (match) {
            return {
                id: match.id,
                title: match.title,
                author: match.author,
                melody: match.melody,
                content: match.content,
                categoryId: category.id,
                categoryName: category.name,
                page_number: match.page_number ?? null,
                negative_page_number: match.negative_page_number ?? null,
            };
        }
    }
    return null;
};

const Song = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [song, setSong] = useState<SongDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const songId = Number(id);
        if (!songId) {
            navigate("/");
            return;
        }

        const auth = JSON.parse(localStorage.getItem("auth") ?? "{}");

        if (!auth?.token) {
            console.error("No authentication token found");
            navigate("/");
            return;
        }

        let cancelled = false;

        const updateFromCategories = (categoriesData: CategoryWithSongs[] | null, finalAttempt: boolean) => {
            if (!categoriesData) {
                return false;
            }

            const hydrated = hydrateSong(songId, categoriesData);
            if (hydrated) {
                setSong(hydrated);
                setError(null);
                return true;
            }

            if (finalAttempt) {
                setSong(null);
                setError("No song found.");
            }

            return false;
        };

        const cachedCategories = getCachedCategories();
        const hasCachedSong = updateFromCategories(cachedCategories, false);
        setIsLoading(!hasCachedSong);

        (async () => {
            try {
                const categories = await fetchCategories(auth.token);
                if (cancelled) return;

                updateFromCategories(categories, true);
                setIsLoading(false);
            } catch (err) {
                console.error("Fetching categories failed:", err);
                if (cancelled) return;
                if (!hasCachedSong) {
                    setError("Failed to load song.");
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id, navigate]);

    if (isLoading && !song) {
        return (
            <div className="page-shell page-shell--centered song-page">
                <p className="empty-state">Loading…</p>
                <Footer />
            </div>
        );
    }

    if (error && !song) {
        return (
            <div className="page-shell page-shell--centered song-page">
                <p className="empty-state">{error}</p>
                <Footer />
            </div>
        );
    }

    if (!song) {
        return (
            <div className="page-shell page-shell--centered song-page">
                <p className="empty-state">No song found.</p>
                <Footer />
            </div>
        );
    }

    return (
        <div className="page-shell page-shell--centered song-page">
            <article className="song-container">
                <header className="song-header">
                    {song.page_number !== null && song.negative_page_number !== null && (
                        <div className="song-page-number song-page-number--header" aria-hidden="true">
                            {song.page_number}
                        </div>
                    )}
                    <h1>{song.title}</h1>
                    <div className="song-meta">
                        {song.author && <p><strong>Author:</strong> {song.author}</p>}
                        <p><strong>Mel:</strong> {song.melody || "Unknown"}</p>
                    </div>
                </header>
                <div className="song-lyrics" dangerouslySetInnerHTML={{ __html: song.content || "" }} />
                {song.page_number !== null && song.negative_page_number === null && (
                    <div className="song-page-number" aria-label="Songbook page number">
                        {song.page_number}
                    </div>
                )}
                {song.negative_page_number !== null && (
                    <div className="song-page-number song-page-number--negative" aria-label="Flipped songbook page number">
                        {song.negative_page_number}
                    </div>
                )}
            </article>
            <Footer />
        </div>
    );
};

export default Song;
