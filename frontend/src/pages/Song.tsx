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

        const cachedCategories = getCachedCategories();
        const cachedSong = hydrateSong(songId, cachedCategories);
        if (cachedSong) {
            setSong(cachedSong);
            setIsLoading(false);
            setError(null);
        } else {
            setIsLoading(true);
        }

        (async () => {
            try {
                const response = await fetch(`/api/songs/${songId}/`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Token ${auth.token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch song ${songId}`);
                }

                const data = await response.json();
                if (cancelled) return;

                let categories = cachedCategories;
                if (!categories) {
                    try {
                        categories = await fetchCategories(auth.token);
                    } catch (catErr) {
                        console.warn("Unable to refresh category cache:", catErr);
                    }
                }

                if (cancelled) return;

                const hydrated = hydrateSong(songId, categories) ?? {
                    id: data.id,
                    title: data.title,
                    author: data.author ?? null,
                    melody: data.melody ?? null,
                    content: data.content ?? null,
                    categoryId: data.category ?? null,
                    categoryName: categories?.find((cat) => cat.id === data.category)?.name ?? "",
                    page_number: data.page_number ?? null,
                    negative_page_number: data.negative_page_number ?? null,
                };

                setSong(hydrated);
                setIsLoading(false);
                setError(null);
            } catch (err) {
                console.error("Fetching song failed:", err);
                if (!cachedSong) {
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
                <h2>Lyrics</h2>
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
