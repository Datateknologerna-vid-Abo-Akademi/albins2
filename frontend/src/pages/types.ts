import React from "react";

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

export type { Song, SongCategory, SongBook};
export type OnSearchType = (query: string) => void;
export type HandleChangeType = (event: React.ChangeEvent<HTMLInputElement>) => void;
export type HandleSubmitType = (event: React.FormEvent<HTMLFormElement>) => void;
