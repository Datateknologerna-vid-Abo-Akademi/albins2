import { useEffect, useState } from "react";
import SearchBar from "../components/SearchBar";
import { Song, SongBook } from './types';

const Main = ({ onBackClick }: { onBackClick: () => void }) => {
    const [songs, setSongs] = useState<SongBook>({});
    const [searchResults, setSearchResults] = useState<Song[]>([]);

    useEffect(() => {
        const auth = JSON.parse(window.localStorage.getItem("auth") ?? "{}");

        fetch("/api/songs/all"
            , {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "token " + auth.token,
                },
            }
        )
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchSongs = (data: any, query: string) => {
        const results: Song[] = [];
        for (const songbook in data) {
            for (const category in data[songbook]) {
                for (const song in data[songbook][category]) {
                    if (data[songbook][category][song].content && data[songbook][category][song].content.toLowerCase().includes(query.toLowerCase())) {
                        results.push(data[songbook][category][song]);
                    }
                    if (song.toLowerCase().includes(query.toLowerCase())) {
                        results.push(data[songbook][category][song]);
                    }
                }
            }
        }
        console.log(results);
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
                    <div key={index} dangerouslySetInnerHTML={{__html: song.content}}>
                    </div>
                ))}
            </div>
            <h1 style={{ marginTop: "10vh" }}>Search bar and songs go here</h1>
        </div>
    );
};

export default Main;