import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Search.css";
import Footer from "../components/Footer";

interface Song {
    id: number;
    title: string;
    author: string;
    melody: string;
    category_name: string;
    content?: string;
}

const Search = () => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const resultsPerPage = 20;
    const navigate = useNavigate();

    // Normalize strings to handle Scandinavian characters
    const normalize = (str: string) =>
        str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    useEffect(() => {
        const auth = JSON.parse(localStorage.getItem("auth") ?? "{}");
        if (!auth?.token) {
            setError("No valid authentication token found. Please authenticate first.");
            return;
        }

        fetch("/api/songs/", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${auth.token}`,
            },
        })
            .then((response) => {
                if (!response.ok) throw new Error("Failed to fetch songs");
                return response.json();
            })
            .then((data) => {
                const formattedSongs = data.map((song: any) => ({
                    id: song.id,
                    title: song.title,
                    author: song.author || "Unknown",
                    melody: song.melody || "Unknown",
                    category_name: song.category_name || "Unknown",
                    content: song.content || "",
                }));
                setSongs(formattedSongs);
                setFilteredSongs(formattedSongs);
            })
            .catch((error) => {
                console.error("Fetching songs failed:", error);
                setError("Failed to load songs. Please try again later.");
            });
    }, []);

    // Re-filter songs when searchQuery changes
    useEffect(() => {
        setCurrentPage(1); // Reset page on new query
        if (!searchQuery.trim()) {
            setFilteredSongs(songs);
            return;
        }

        const queryNorm = normalize(searchQuery);

        // Ranking logic for sorting results
        const rankSong = (song: Song): number | null => {
            let rank: number | null = null;
            const titleNorm = normalize(song.title);
            const authorNorm = normalize(song.author);
            const melodyNorm = normalize(song.melody);
            const categoryNorm = normalize(song.category_name);
            const contentNorm = normalize(song.content || "");

            if (titleNorm.includes(queryNorm)) {
                rank = titleNorm === queryNorm ? 1 : 2;
            }
            if (rank === null && authorNorm.includes(queryNorm)) {
                rank = authorNorm === queryNorm ? 3 : 4;
            }
            if (rank === null && contentNorm.includes(queryNorm)) {
                rank = 5;
            }
            if (rank === null && melodyNorm.includes(queryNorm)) {
                rank = melodyNorm === queryNorm ? 6 : 7;
            }
            if (rank === null && categoryNorm.includes(queryNorm)) {
                rank = categoryNorm === queryNorm ? 6 : 7;
            }
            return rank;
        };

        // Filter and sort songs based on ranking
        const matchedSongs = songs
            .map((song) => {
                const rank = rankSong(song);
                return rank !== null ? { ...song, rank } : null;
            })
            .filter((song): song is Song & { rank: number } => song !== null)
            .sort((a, b) => a.rank - b.rank);

        setFilteredSongs(matchedSongs);
    }, [searchQuery, songs]);

    // Determine which songs to show on the current page
    const indexOfLastResult = currentPage * resultsPerPage;
    const indexOfFirstResult = indexOfLastResult - resultsPerPage;
    const currentResults = filteredSongs.slice(indexOfFirstResult, indexOfLastResult);
    const totalPages = Math.ceil(filteredSongs.length / resultsPerPage);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handlePageSelect = (page: number) => {
        setCurrentPage(page);
    };

    return (
        <div className="search-container">
            <h1>Search Songs</h1>
            {error && <p className="error">{error}</p>}
            <input
                type="text"
                placeholder="Search by title, lyrics, or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                aria-label="Search songs"
            />
            <div className="songs-grid">
                {currentResults.length > 0 ? (
                    currentResults.map((song) => (
                        <div
                            key={song.id}
                            className="song-card"
                            onClick={() => navigate(`/song/${song.id}`)}
                            style={{ cursor: "pointer" }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") navigate(`/song/${song.id}`);
                            }}
                            aria-label={`View details for ${song.title}`}
                        >
                            <h2>{song.title}</h2>
                            <p>
                                <strong>Melody:</strong> {song.melody}
                            </p>
                            <p>
                                <strong>Category:</strong> {song.category_name}
                            </p>
                        </div>
                    ))
                ) : (
                    <p>No matching songs found.</p>
                )}
            </div>
            {/* Pagination Controls */}
            {filteredSongs.length > 0 && (
                <div className="pagination-controls">
                    <button 
                        className="nav-button" 
                        onClick={handlePrevPage} 
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                    >
                        ←
                    </button>
                    <div className="pagination-pages">
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i}
                                className={`page-button ${currentPage === i + 1 ? "active" : ""}`}
                                onClick={() => handlePageSelect(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                    <button 
                        className="nav-button" 
                        onClick={handleNextPage} 
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                    >
                        →
                    </button>
                </div>
            )}
            <Footer />
        </div>
    );
};

export default Search;
