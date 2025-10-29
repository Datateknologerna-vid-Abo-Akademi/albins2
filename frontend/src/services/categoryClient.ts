import { getCache, setCache, clearCache, CACHE_KEYS } from '../utils/cache';

export const CATEGORY_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface SongSummary {
  id: number;
  title: string;
  author: string | null;
  melody: string | null;
  order: number | null;
  page_number: number | null;
  negative_page_number: number | null;
  content: string | null;
  category: number;
}

export interface SongWithCategory extends SongSummary {
  categoryName: string;
}

export interface CategoryWithSongs {
  id: number;
  name: string;
  order: number | null;
  songs: SongSummary[];
}

const sortSongs = (songs: SongSummary[] = []): SongSummary[] => {
  return [...songs].sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;

    if (orderA === orderB) {
      return a.title.localeCompare(b.title);
    }

    return orderA - orderB;
  });
};

const sortCategories = (categories: CategoryWithSongs[]): CategoryWithSongs[] => {
  return [...categories]
    .map((category) => ({
      ...category,
      songs: sortSongs(category.songs ?? []),
    }))
    .sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;

      if (orderA === orderB) {
        return a.name.localeCompare(b.name);
      }

      return orderA - orderB;
    });
};

export const getCachedCategories = (): CategoryWithSongs[] | null => {
  const cached = getCache<CategoryWithSongs[]>(CACHE_KEYS.categories, CATEGORY_CACHE_TTL_MS);
  return cached ? sortCategories(cached) : null;
};

export const fetchCategories = async (token: string): Promise<CategoryWithSongs[]> => {
  const response = await fetch('/api/categories/', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }

  const data = (await response.json()) as CategoryWithSongs[];
  const sorted = sortCategories(data);
  setCache(CACHE_KEYS.categories, sorted);
  return sorted;
};

export const clearCategoryCache = () => clearCache([CACHE_KEYS.categories]);

export const getAllSongsFromCategories = (): SongWithCategory[] | null => {
  const categories = getCachedCategories();
  if (!categories) {
    return null;
  }

  const songs: SongWithCategory[] = [];
  categories.forEach((category) => {
    category.songs?.forEach((song) => {
      songs.push({
        ...song,
        category: category.id,
        categoryName: category.name,
      });
    });
  });

  return songs;
};
