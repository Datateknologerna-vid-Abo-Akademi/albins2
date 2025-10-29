import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import PaginationControls from "../components/PaginationControls";
import SongList from "../components/SongList";
import SongSearchInput from "../components/SongSearchInput";
import "../styles/Search.css";
import { SongWithCategory, fetchCategories, getAllSongsFromCategories } from "../services/categoryClient";

type SearchSong = SongWithCategory & {
    author: string;
    melody: string;
    content: string;
};

const Search = () => {
    const [songs, setSongs] = useState<SearchSong[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredSongs, setFilteredSongs] = useState<SearchSong[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
            setIsLoading(false);
            return;
        }

        let cancelled = false;

        const applySongs = (data: ReturnType<typeof getAllSongsFromCategories>) => {
            if (!data || cancelled) return;
            const formattedSongs: SearchSong[] = data.map((song) => ({
                id: song.id,
                title: song.title,
                author: song.author || "Unknown",
                melody: song.melody || "Unknown",
                category: song.category,
                categoryName: song.categoryName || "Unknown",
                order: song.order,
                page_number: song.page_number,
                negative_page_number: song.negative_page_number,
                content: song.content || "",
            }));
            setSongs(formattedSongs);
            setFilteredSongs(formattedSongs);
            setError(null);
        };

        const cached = getAllSongsFromCategories();
        if (cached) {
            applySongs(cached);
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }

        if (!cached) {
            (async () => {
                try {
                    await fetchCategories(auth.token);
                    if (cancelled) return;
                    const refreshed = getAllSongsFromCategories();
                    applySongs(refreshed);
                } catch (err) {
                    if (cancelled) return;
                    console.error("Fetching songs failed:", err);
                    setError("Failed to load songs. Please try again later.");
                } finally {
                    if (!cancelled) {
                        setIsLoading(false);
                    }
                }
            })();
        }

        return () => {
            cancelled = true;
        };
    }, []);

    // Re-filter songs when searchQuery changes
    useEffect(() => {
        setCurrentPage(1); // Reset page on new query
        const trimmed = searchQuery.trim();
        if (!trimmed) {
            const sortedByPage = [...songs].sort((a, b) => {
                const pageA = a.page_number ?? Number.MAX_SAFE_INTEGER;
                const pageB = b.page_number ?? Number.MAX_SAFE_INTEGER;
                if (pageA !== pageB) {
                    return pageA - pageB;
                }

                return a.title.localeCompare(b.title);
            });
            setFilteredSongs(sortedByPage);
            return;
        }

        const queryNorm = normalize(trimmed);

        // Ranking logic for sorting results
        const rankSong = (song: SearchSong): number | null => {
            let rank: number | null = null;
            const titleNorm = normalize(song.title);
            const authorNorm = normalize(song.author);
            const melodyNorm = normalize(song.melody);
            const categoryNorm = normalize(song.categoryName);
            const contentNorm = normalize(song.content || "");

            const trimmedQuery = searchQuery.trim();
            if (trimmedQuery) {
                const numericQuery = Number(trimmedQuery);
                const isNumeric = Number.isFinite(numericQuery);
                const matchesNumber = (value: number | null) => {
                    if (value === null) return false;
                    if (value.toString() === trimmedQuery) return true;
                    return isNumeric && value === numericQuery;
                };

                if (matchesNumber(song.page_number) || matchesNumber(song.negative_page_number)) {
                    return 0;
                }
            }

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
            .filter((song): song is SearchSong & { rank: number } => song !== null)
            .sort((a, b) => {
                if (a.rank !== b.rank) {
                    return a.rank - b.rank;
                }

                const pageA = a.page_number ?? Number.MAX_SAFE_INTEGER;
                const pageB = b.page_number ?? Number.MAX_SAFE_INTEGER;
                if (pageA !== pageB) {
                    return pageA - pageB;
                }

                return a.title.localeCompare(b.title);
            });

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
        <div className="page-shell search-container">
            <h1 className="page-heading">Search Songs</h1>
            <SongSearchInput value={searchQuery} onChange={setSearchQuery} />
            <SongList
                songs={currentResults}
                isLoading={isLoading}
                error={error}
                layout="center"
                emptyMessage="No matching songs found."
                onSelectSong={(songId) => navigate(`/song/${songId}`)}
                getDetails={(song) => [
                    { label: "Melody", value: song.melody || "Unknown" },
                    { label: "Category", value: song.categoryName || "Unknown" },
                ]}
            />
            {filteredSongs.length > 0 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onNext={handleNextPage}
                    onPrev={handlePrevPage}
                    onSelectPage={handlePageSelect}
                />
            )}
            <Footer />
        </div>
    );
};

export default Search;
