import { useNavigate } from "react-router-dom";
import "../styles/Categories.css";
import React from "react";

interface CategoryCardProps {
    category: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
    const navigate = useNavigate();

    return (
        <div
            className="category-card"
            onClick={() => navigate(`/songs?category=${encodeURIComponent(category)}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") navigate(`/songs?category=${encodeURIComponent(category)}`); }}
            aria-label={`View songs in category ${category}`}
        >
            <h2>{category}</h2>
        </div>
    );
};

export default CategoryCard;
