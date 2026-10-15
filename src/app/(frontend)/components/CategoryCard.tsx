import { useRouter } from "next/navigation";
import React from "react";

interface CategoryCardProps {
    category: {
        id: number;
        name: string;
    };
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
    const router = useRouter();

    return (
        <div
            className="category-card card card--interactive card--center"
            onClick={() => router.push(`/songs?category=${encodeURIComponent(category.name)}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") router.push(`/songs?category=${encodeURIComponent(category.name)}`); }}
            aria-label={`View songs in category ${category.name}`}
        >
            <h2>{category.name}</h2>
        </div>
    );
};

export default CategoryCard;
