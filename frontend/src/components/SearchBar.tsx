import React, { useState } from "react";
import { OnSearchType } from "../pages/types";
import "../styles/Footer.css";

interface SearchBarProps {
    onSearch: OnSearchType;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
    const [query, setQuery] = useState("");

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
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
