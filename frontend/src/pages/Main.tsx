import { useEffect, useState } from "react";
import SearchBar from "../components/SearchBar";
import { Song, SongBook, SongCategory } from './types';

const Main = ({ onBackClick }: { onBackClick: () => void }) => {
    const [songs, setSongs] = useState<SongBook>({});
    const [searchResults, setSearchResults] = useState<Song[]>([]);

    useEffect(() => {
        fetch("http://localhost:8000/api/songs/all")
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
            .then((data) => {
                setSongs(data);
            })
            .catch((error) => {
                console.error(error.message);
            });
    }, []);

    const searchSongs = (songs: SongBook, query: string) => {
        const results: Song[] = [];
        Object.values(songs).forEach((songBook: SongCategory) => {
            Object.values(songBook).forEach((category: Song) => {
                if (
                    category.title.toLowerCase().includes(query.toLowerCase()) ||
                    category.content.toLowerCase().includes(query.toLowerCase())
                ) {
                    results.push(category);
                }
            });
        });
        return results;
    };

    const handleSearch = (query: string) => {
        if (!query) {
            setSearchResults([]);
        } else {
            const results = searchSongs(songs, query);
            setSearchResults(results);
        }
    };

    return (
        <div>
            <button
                className={"back"}
                onClick={onBackClick}
                style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    fontSize: "3rem",
                    color: "white",
                    cursor: "pointer",
                    background: "transparent",
                    border: "none",
                }}
            >
                <i className="las la-arrow-circle-left"></i>
            </button>
            <SearchBar onSearch={handleSearch} />
            <div>
                {searchResults.map((song, index) => (
                    <div key={index}>
                        <h3>{song.title}</h3>
                        <p>{song.content}</p>
                        {/* Render more song details here */}
                    </div>
                ))}
            </div>
            <h1 style={{ marginTop: "10vh" }}>Search bar and songs go here</h1>
        </div>
    );
};

export default Main;