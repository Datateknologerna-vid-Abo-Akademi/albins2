import { SongSummary } from "../services/categoryClient";

export type SongDetail = {
    label: string;
    value: string;
};

type SongCardProps = {
    song: SongSummary;
    onSelect: (songId: number) => void;
    layout?: "left" | "center";
    details?: SongDetail[];
};

const SongCard = ({
    song,
    onSelect,
    layout = "left",
    details,
}: SongCardProps) => {
    const cardClassNames = [
        "song-card",
        "card",
        "card--interactive",
        layout === "center" ? "card--center" : "card--left",
    ].join(" ");

    return (
        <div
            className={cardClassNames}
            onClick={() => onSelect(song.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    onSelect(song.id);
                }
            }}
            aria-label={`View details for ${song.title}`}
        >
            <h2>{song.title}</h2>
            {details?.map((detail) => (
                <p key={detail.label}>
                    <strong>{detail.label}:</strong> {detail.value}
                </p>
            ))}
            {song.page_number !== null && (
                <p className="song-card__page">Page {song.page_number}</p>
            )}
            {song.negative_page_number !== null && (
                <p className="song-card__page">Flipped Page {song.negative_page_number}</p>
            )}
        </div>
    );
};

export default SongCard;
