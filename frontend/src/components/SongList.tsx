import SongCard, { type SongDetail } from "./SongCard";
import type { SongSummary } from "../services/categoryClient";

type SongListProps<T extends SongSummary = SongSummary> = {
    songs: T[];
    isLoading: boolean;
    error: string | null;
    onSelectSong: (songId: number) => void;
    layout?: "left" | "center";
    emptyMessage?: string;
    loadingMessage?: string;
    getDetails?: (song: T) => SongDetail[];
};

const SongList = <T extends SongSummary>({
    songs,
    isLoading,
    error,
    onSelectSong,
    layout = "left",
    emptyMessage = "No songs found in this category.",
    loadingMessage = "Loading songs…",
    getDetails,
}: SongListProps<T>) => {
    if (isLoading) {
        return (
            <div className="songs-grid card-grid">
                <p className="empty-state">{loadingMessage}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="songs-grid card-grid">
                <p className="empty-state">{error}</p>
            </div>
        );
    }

    if (!songs.length) {
        return (
            <div className="songs-grid card-grid">
                <p className="empty-state">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="songs-grid card-grid">
            {songs.map((song) => (
                <SongCard
                    key={song.id}
                    song={song}
                    onSelect={onSelectSong}
                    layout={layout}
                    details={
                        getDetails
                            ? getDetails(song)
                            : [{ label: "Melody", value: song.melody || "Unknown" }]
                    }
                />
            ))}
        </div>
    );
};

export default SongList;
