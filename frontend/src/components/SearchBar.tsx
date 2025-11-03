import type { ChangeEvent, FC, FormEvent } from "react";
import { useState } from "react";
import type { OnSearchType } from "../pages/types";
import "../styles/Footer.css";

interface SearchBarProps {
    onSearch: OnSearchType;
}

const SearchBar: FC<SearchBarProps> = ({ onSearch }) => {
    const [query, setQuery] = useState("");

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSearch(query);
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                value={query}
                onChange={handleChange}
                placeholder="Search songs..."
            />
            <button type="submit">Search</button>
        </form>
    );
};

export default SearchBar;
