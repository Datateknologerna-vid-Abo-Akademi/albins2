import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import "../styles/song.css";

interface Song {
    id: number;
    title: string;
    author: string;
    melody: string;
    content: string;
    category: string;
}

const Song = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [song, setSong] = useState<Song | null>(null);

    useEffect(() => {
        const auth = JSON.parse(localStorage.getItem("auth") ?? "{}");

        if (!auth?.token) {
            console.error("No authentication token found");
            navigate("/");
            return;
        }

        fetch(`/api/songs/${id}/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${auth.token}`,
            },
        })
            .then((response) => response.json())
            .then((data) => {
                setSong(data);
            })
            .catch((error) => console.error("Fetching song failed:", error));
    }, [id, navigate]);

    if (!song) return <p>Loading...</p>;

    return (
        <div className="song-container">
            <button className="back" onClick={() => navigate(-1)}>← Back</button>
            <h1>{song.title}</h1>
            <p><strong>Melody:</strong> {song.melody}</p>
            <h2>Lyrics</h2>
            <div dangerouslySetInnerHTML={{ __html: song.content }} />
            <Footer />
        </div>
    );
};

export default Song;
