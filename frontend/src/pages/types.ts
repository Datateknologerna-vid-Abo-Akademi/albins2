import type { ChangeEvent, FormEvent } from "react";

interface Song {
    title: string;
    melody: string;
    author: string;
    content: string;
    audio: string;
    category: string;
    order: number;
}

interface SongCategory {
    [key: string]: Song;
}

interface SongBook {
    [key: string]: SongCategory;
}

export type { Song, SongCategory, SongBook };
export type OnSearchType = (query: string) => void;
export type HandleChangeType = (event: ChangeEvent<HTMLInputElement>) => void;
export type HandleSubmitType = (event: FormEvent<HTMLFormElement>) => void;
