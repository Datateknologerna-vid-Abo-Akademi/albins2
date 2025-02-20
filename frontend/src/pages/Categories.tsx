import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import CategoryCard from "../components/CategoryCard";
import "../styles/Categories.css";
import "../styles/Footer.css";

const Categories = () => {
    const [categories, setCategories] = useState<string[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const auth = JSON.parse(localStorage.getItem("auth") ?? "{}");

        if (!auth?.token) {
            console.error("No authentication token found");
            navigate("/");
            return;
        }

        fetch("/api/categories/", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${auth.token}`,
            },
        })
            .then((response) => response.ok ? response.json() : Promise.reject("Unauthorized request"))
            .then((data) => {
                setCategories(data.map((category: { name: string }) => category.name));
            })
            .catch((error) => console.error("Fetching categories failed:", error));
    }, [navigate]);

    return (
        <div className="categories-container">
            <h1>Categories</h1>
            <div className="categories-grid">
                {categories.length > 0 ? (
                    categories.map((category, index) => (
                        <CategoryCard key={index} category={category} />
                    ))
                ) : (
                    <p>No categories found.</p>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default Categories;
