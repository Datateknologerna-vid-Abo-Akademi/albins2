import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Footer from "../components/Footer";

const Main = () => {
    const [songs, setSongs] = useState<{ title: string; content: string }[]>([]);
    const [searchParams] = useSearchParams();
    const category = searchParams.get("category");

    useEffect(() => {
        if (!category) return;

        const auth = JSON.parse(window.localStorage.getItem("auth") ?? "{}");

        if (!auth || !auth.token) {
            console.error("No authentication token found");
            return;
        }

        fetch("/api/songs/all", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Token " + auth.token,
            },
        })
            .then((response) => response.json())
            .then((data) => {
                const songsInCategory = [];
                for (const songbook in data) {
                    if (data[songbook][category]) {
                        for (const songTitle in data[songbook][category]) {
                            songsInCategory.push({
                                title: songTitle,
                                content: data[songbook][category][songTitle].content,
                            });
                        }
                    }
                }
                setSongs(songsInCategory);
            })
            .catch((error) => {
                console.error("Fetching songs failed:", error.message);
            });
    }, [category]);

    return (
        <div className="songs-container">
            <h1>{category}</h1>
            {songs.map((song, index) => (
                <div key={index} className="song-card">
                    <h2>{song.title}</h2>
                    <div dangerouslySetInnerHTML={{ __html: song.content }} />
                </div>
            ))}
            <Footer />
        </div>
    );
};

export default Main;
