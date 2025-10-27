import { useNavigate } from "react-router-dom";
import "../styles/Categories.css";
import React from "react";

interface CategoryCardProps {
    category: {
        id: number;
        name: string;
    };
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
    const navigate = useNavigate();

    return (
        <div
            className="category-card card card--interactive card--center"
            onClick={() => navigate(`/songs?category=${encodeURIComponent(category.name)}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") navigate(`/songs?category=${encodeURIComponent(category.name)}`); }}
            aria-label={`View songs in category ${category.name}`}
        >
            <h2>{category.name}</h2>
        </div>
    );
};

export default CategoryCard;
