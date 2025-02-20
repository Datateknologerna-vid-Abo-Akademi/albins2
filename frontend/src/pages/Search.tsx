import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";

interface Song {
    id: number;
    title: string;
    author: string;
    melody: string;
    category: string;
}

const Search = () => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const auth = JSON.parse(localStorage.getItem("auth") ?? "{}");

        if (!auth?.token) {
            console.error("No authentication token found");
            return;
        }

        fetch("/api/songs/", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${auth.token}`,
            },
        })
            .then((response) => response.json())
            .then((data) => {
                const formattedSongs = data.map((song: any) => ({
                    id: song.id,
                    title: song.title,
                    author: song.author || "Unknown",
                    melody: song.melody || "Unknown",
                    category: typeof song.category === "string" ? song.category : song.category?.name || "Unknown",
                }));
                setSongs(formattedSongs);
                setFilteredSongs(formattedSongs);
            })
            .catch((error) => console.error("Fetching songs failed:", error));
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredSongs(songs);
            return;
        }

        const lowerQuery = searchQuery.toLowerCase();
        setFilteredSongs(
            songs.filter(song =>
                song.title.toLowerCase().includes(lowerQuery) ||
                song.author.toLowerCase().includes(lowerQuery) ||
                song.melody.toLowerCase().includes(lowerQuery) ||
                song.category.toLowerCase().includes(lowerQuery)
            )
        );
    }, [searchQuery, songs]);

    return (
        <div className="search-container">
            <h1>Search Songs</h1>
            <input
                type="text"
                placeholder="Search by title, author, melody, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
            />
            <div className="songs-grid">
                {filteredSongs.length > 0 ? (
                    filteredSongs.map((song) => (
                        <div
                            key={song.id}
                            className="song-card"
                            onClick={() => navigate(`/song/${song.id}`)}
                            style={{ cursor: "pointer" }} // Makes it clear it's clickable
                        >
                            <h2>{song.title}</h2>
                            <p><strong>Author:</strong> {song.author}</p>
                            <p><strong>Melody:</strong> {song.melody}</p>
                            <p><strong>Category:</strong> {song.category}</p>
                        </div>
                    ))
                ) : (
                    <p>No matching songs found.</p>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default Search;
