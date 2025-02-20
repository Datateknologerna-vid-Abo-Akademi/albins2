import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import "../styles/Songs.css";

interface Song {
    id: number;
    title: string;
    author: string;
    melody: string;
}

const Songs = () => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const category = searchParams.get("category");

    useEffect(() => {
        if (!category) return;

        const auth = JSON.parse(localStorage.getItem("auth") ?? "{}");

        if (!auth?.token) {
            console.error("No authentication token found");
            navigate("/");
            return;
        }

        fetch(`/api/categories/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${auth.token}`,
            },
        })
            .then((response) => response.json())
            .then((data) => {
                const categoryData = data.find((c: { name: string }) => c.name === category);
                if (categoryData) {
                    setSongs(categoryData.songs);
                } else {
                    setSongs([]);
                }
            })
            .catch((error) => console.error("Fetching songs failed:", error));
    }, [category, navigate]);

    return (
        <div className="songs-container">
            <button className="back" onClick={() => navigate("/categories")}>← Back</button>
            <h1>{category}</h1>
            <div className="songs-grid">
                {songs.length > 0 ? (
                    songs.map((song) => (
                        <div
                            key={song.id}
                            className="song-card"
                            onClick={() => navigate(`/song/${song.id}`)}
                            style={{ cursor: "pointer" }}
                        >
                            <h2>{song.title}</h2>
                            <p><strong>Author:</strong> {song.author}</p>
                            <p><strong>Melody:</strong> {song.melody}</p>
                        </div>
                    ))
                ) : (
                    <p>No songs found in this category.</p>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default Songs;
