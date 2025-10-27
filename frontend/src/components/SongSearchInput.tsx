type SongSearchInputProps = {
    value: string;
    onChange: (value: string) => void;
};

const SongSearchInput = ({ value, onChange }: SongSearchInputProps) => (
    <input
        type="text"
        placeholder="Search by title, lyrics, or author..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="search-input"
        aria-label="Search songs"
    />
);

export default SongSearchInput;
