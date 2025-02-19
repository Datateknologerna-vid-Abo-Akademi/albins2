import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";

const Categories = () => {
    const [categories, setCategories] = useState<string[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const auth = JSON.parse(window.localStorage.getItem("auth") ?? "{}");

        if (!auth || !auth.token) {
            console.error("No authentication token found");
            navigate("/");
            return;
        }

        fetch("/api/songs/all", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Token " + auth.token,
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Unauthorized request or network issue");
                }
                return response.json();
            })
            .then((data) => {
                // Extract categories
                const categoriesList = new Set<string>();
                for (const songbook in data) {
                    for (const category in data[songbook]) {
                        categoriesList.add(category);
                    }
                }
                setCategories(Array.from(categoriesList));
            })
            .catch((error) => {
                console.error("Fetching categories failed:", error.message);
            });
    }, [navigate]);

    return (
        <div className="categories-container">
            <h1>Categories</h1>
            <div className="categories-grid">
                {categories.map((category, index) => (
                    <button
                        key={index}
                        className="category-button"
                        onClick={() => navigate(`/songs?category=${encodeURIComponent(category)}`)}
                    >
                        {category}
                    </button>
                ))}
            </div>
            <Footer />
        </div>
    );
};

export default Categories;
