import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
    fetchCategories,
    getAllSongsFromCategories,
    getCachedCategories,
} from "./categoryClient";
import type { CategoryWithSongs, SongBook } from "./categoryClient";
import { CACHE_KEYS, clearCache, setCache } from "../utils/cache";

const cacheKey = `albins:${CACHE_KEYS.categories}`;

const createMockLocalStorage = () => {
    const store = new Map<string, string>();

    return {
        get length() {
            return store.size;
        },
        clear: () => store.clear(),
        getItem: (key: string) => store.get(key) ?? null,
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        removeItem: (key: string) => {
            store.delete(key);
        },
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
    };
};

const buildCategoriesFixture = (): CategoryWithSongs[] => [
    {
        id: 2,
        name: "Zeta",
        order: 2,
        songs: [
            {
                id: 20,
                title: "Beta Song",
                author: null,
                melody: null,
                order: 3,
                page_number: 120,
                negative_page_number: -120,
                content: null,
                category: 2,
            },
            {
                id: 21,
                title: "Alpha Song",
                author: null,
                melody: null,
                order: 1,
                page_number: 115,
                negative_page_number: -115,
                content: null,
                category: 2,
            },
        ],
    },
    {
        id: 3,
        name: "Gamma",
        order: null,
        songs: [
            {
                id: 30,
                title: "Gamma Song",
                author: null,
                melody: null,
                order: null,
                page_number: null,
                negative_page_number: null,
                content: null,
                category: 3,
            },
        ],
    },
    {
        id: 1,
        name: "Alpha",
        order: 2,
        songs: [
            {
                id: 10,
                title: "Delta Song",
                author: null,
                melody: null,
                order: null,
                page_number: null,
                negative_page_number: null,
                content: null,
                category: 1,
            },
            {
                id: 11,
                title: "Alpha Song",
                author: null,
                melody: null,
                order: 2,
                page_number: 45,
                negative_page_number: -45,
                content: null,
                category: 1,
            },
        ],
    },
    {
        id: 4,
        name: "Omega",
        order: 5,
        songs: [
            {
                id: 40,
                title: "Omega Song",
                author: null,
                melody: null,
                order: 1,
                page_number: 5,
                negative_page_number: -5,
                content: null,
                category: 4,
            },
        ],
    },
];

beforeEach(() => {
    vi.useRealTimers();
    const mockStorage = createMockLocalStorage();
    vi.stubGlobal("localStorage", mockStorage);
    Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: mockStorage,
    });
});

afterEach(() => {
    vi.restoreAllMocks();
    clearCache();
    Reflect.deleteProperty(window, "localStorage");
    Reflect.deleteProperty(globalThis, "localStorage");
});

describe("getCachedCategories", () => {
    it("returns categories sorted by order and name, with songs sorted by order then title", () => {
        const unsorted = buildCategoriesFixture();
        setCache(CACHE_KEYS.categories, unsorted);

        const result = getCachedCategories();
        expect(result).not.toBeNull();
        expect(result?.map((category) => category.name)).toEqual([
            "Alpha",
            "Zeta",
            "Omega",
            "Gamma",
        ]);

        expect(result?.[0].songs.map((song) => song.title)).toEqual([
            "Alpha Song",
            "Delta Song",
        ]);
        expect(result?.[1].songs.map((song) => song.title)).toEqual([
            "Alpha Song",
            "Beta Song",
        ]);
    });
});

describe("fetchCategories", () => {
    it("requests sorted categories from the API and caches the response", async () => {
        const fixture = buildCategoriesFixture();
        const responsePayload: SongBook = {
            id: 42,
            name: "Test Songbook",
            categories: fixture,
        };
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => responsePayload,
        } as Response);
        const originalFetch = globalThis.fetch;
        // Vitest runs in jsdom which exposes fetch globally; temporarily replace it.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        globalThis.fetch = fetchMock as any;

        try {
            const result = await fetchCategories("secret-token");

            expect(fetchMock).toHaveBeenCalledWith("/api/songbook/", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Token secret-token",
                },
            });

            expect(result.map((category) => category.name)).toEqual([
                "Alpha",
                "Zeta",
                "Omega",
                "Gamma",
            ]);

            const rawCache = localStorage.getItem(cacheKey);
            expect(rawCache).not.toBeNull();
            const cached = JSON.parse(rawCache || "{}");
            expect(typeof cached.timestamp).toBe("number");
            expect(cached.data[0].songs[0].title).toBe("Alpha Song");
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});

describe("getAllSongsFromCategories", () => {
    it("returns null when categories are not cached", () => {
        expect(getAllSongsFromCategories()).toBeNull();
    });

    it("flattens cached categories into song summaries with category metadata", () => {
        const categories = buildCategoriesFixture();
        setCache(CACHE_KEYS.categories, categories);

        const songs = getAllSongsFromCategories();

        expect(songs).not.toBeNull();
        expect(songs?.length).toBeGreaterThan(0);
        expect(songs?.[0]).toMatchObject({
            categoryName: expect.any(String),
            category: expect.any(Number),
        });

        const targetSong = songs?.find((song) => song.id === 21);
        expect(targetSong).toMatchObject({
            title: "Alpha Song",
            categoryName: "Zeta",
        });
    });
});
