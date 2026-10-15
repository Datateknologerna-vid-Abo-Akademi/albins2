"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "../components/Footer";
import CategoryCard from "../components/CategoryCard";
import { fetchCategories, getCachedCategories } from "../services/categoryClient";
import type { CategoryWithSongs } from "../services/categoryClient";

interface CategoryItem {
    id: number;
    name: string;
    order: number | null;
}

const Categories = () => {
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const auth = JSON.parse(localStorage.getItem("auth") ?? "{}");

        if (!auth?.token) {
            console.error("No authentication token found");
            router.push("/");
            return;
        }

        let cancelled = false;

        const applyCategories = (data: CategoryWithSongs[]) => {
            if (cancelled) return;
            const formatted: CategoryItem[] = data.map(({ id, name, order }) => ({ id, name, order }));
            setCategories(formatted);
        };

        const cached = getCachedCategories();
        if (cached) {
            applyCategories(cached);
            setIsLoading(false);
            setError(null);
        } else {
            setIsLoading(true);
        }

        if (!cached) {
            (async () => {
                try {
                    const data = await fetchCategories(auth.token);
                    applyCategories(data);
                    if (!cancelled) {
                        setIsLoading(false);
                        setError(null);
                    }
                } catch (err) {
                    if (cancelled) return;
                    console.error("Fetching categories failed:", err);
                    setIsLoading(false);
                    if (!cached) {
                        setError("Failed to load categories.");
                    }
                }
            })();
        }

        return () => {
            cancelled = true;
        };
    }, [router]);

    const showSkeletons = isLoading && categories.length === 0;
    const skeletonCount = Math.max(categories.length, 6);

    return (
        <div className="page-shell categories-container">
            <h1 className="page-heading">Categories</h1>
            <div className="categories-grid card-grid">
                {showSkeletons ? (
                    <>
                        <span className="sr-only" role="status" aria-live="polite">Loading categories…</span>
                        {Array.from({ length: skeletonCount }).map((_, index) => (
                            <div
                                key={`category-skeleton-${index}`}
                                className="category-card card card--center category-card--skeleton"
                                aria-hidden="true"
                            >
                                <div className="category-card__skeleton-bar" />
                            </div>
                        ))}
                    </>
                ) : error && categories.length === 0 ? (
                    <p className="empty-state">{error}</p>
                ) : categories.length > 0 ? (
                    categories.map((category) => (
                        <CategoryCard key={category.id} category={category} />
                    ))
                ) : (
                    <p className="empty-state">No categories found.</p>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default Categories;
